import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogService } from './blog.service';
import { BlogResolver } from './blog.resolver';
import { Blog } from './entities/blog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blog])],
  providers: [BlogService, BlogResolver],
  exports: [BlogService],
})
export class BlogModule {}

