import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('user_notification_state')
export class UserNotificationState {
  @Field(() => ID)
  @PrimaryColumn()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  lastSeenMarkerVersion: number;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

