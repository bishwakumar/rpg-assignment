import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Blog } from './entities/blog.entity';
import { CreateBlogInput } from './dto/create-blog.input';
import { UpdateBlogInput } from './dto/update-blog.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';

@Resolver(() => Blog)
export class BlogResolver {
  constructor(private blogService: BlogService) {}

  @Mutation(() => Blog)
  @UseGuards(JwtAuthGuard)
  async createBlog(
    @Args('input') createBlogInput: CreateBlogInput,
    @Context() context: { req: { user: User } },
  ): Promise<Blog> {
    return this.blogService.create(createBlogInput, context.req.user);
  }

  @Query(() => [Blog])
  async blogs(): Promise<Blog[]> {
    return this.blogService.findAll();
  }

  @Query(() => Blog)
  async blog(@Args('id', { type: () => ID }) id: string): Promise<Blog> {
    return this.blogService.findOne(id);
  }

  @Mutation(() => Blog)
  @UseGuards(JwtAuthGuard)
  async updateBlog(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateBlogInput: UpdateBlogInput,
    @Context() context: { req: { user: User } },
  ): Promise<Blog> {
    return this.blogService.update(id, updateBlogInput, context.req.user);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteBlog(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: { req: { user: User } },
  ): Promise<boolean> {
    return this.blogService.remove(id, context.req.user);
  }
}

