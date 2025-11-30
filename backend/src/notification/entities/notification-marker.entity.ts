import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Blog } from '../../blog/entities/blog.entity';

@ObjectType()
@Entity('notification_markers')
export class NotificationMarker {
  @Field(() => Int)
  @PrimaryGeneratedColumn({ type: 'int' })
  markerVersion: number;

  @Field(() => ID)
  @Column()
  blogId: string;

  @Field(() => Blog)
  @ManyToOne(() => Blog, { eager: true })
  @JoinColumn({ name: 'blogId' })
  blog: Blog;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}

