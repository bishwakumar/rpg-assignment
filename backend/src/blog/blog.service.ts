import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogInput } from './dto/create-blog.input';
import { UpdateBlogInput } from './dto/update-blog.input';
import { User } from '../auth/entities/user.entity';
import { NotificationQueueService } from '../notification/queue/notification-queue.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private blogRepository: Repository<Blog>,
    private notificationQueue: NotificationQueueService,
  ) {}

  async create(createBlogInput: CreateBlogInput, author: User): Promise<Blog> {
    const blog = this.blogRepository.create({
      ...createBlogInput,
      author,
      authorId: author.id,
    });

    const savedBlog = await this.blogRepository.save(blog);

    // Load author relation for response
    const blogWithAuthor = await this.blogRepository.findOne({
      where: { id: savedBlog.id },
      relations: ['author'],
    });

    if (!blogWithAuthor) {
      throw new Error('Failed to load blog with author');
    }

    // Enqueue blog created event to notification queue
    // The notification worker will process this asynchronously
    await this.notificationQueue.enqueueBlogCreatedEvent({
      blogId: blogWithAuthor.id,
      title: blogWithAuthor.title,
      authorId: blogWithAuthor.authorId,
      createdAt: blogWithAuthor.createdAt,
    });

    return blogWithAuthor;
  }

  async findAll(): Promise<Blog[]> {
    return this.blogRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    return blog;
  }

  async update(id: string, updateBlogInput: UpdateBlogInput, user: User): Promise<Blog> {
    const blog = await this.findOne(id);

    if (blog.authorId !== user.id) {
      throw new UnauthorizedException('You can only update your own blogs');
    }

    Object.assign(blog, updateBlogInput);
    return this.blogRepository.save(blog);
  }

  async remove(id: string, user: User): Promise<boolean> {
    const blog = await this.findOne(id);

    if (blog.authorId !== user.id) {
      throw new UnauthorizedException('You can only delete your own blogs');
    }

    await this.blogRepository.remove(blog);
    return true;
  }
}

