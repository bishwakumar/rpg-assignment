import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class CreateBlogInput {
  @Field()
  @IsString()
  @MinLength(1)
  title: string;

  @Field()
  @IsString()
  @MinLength(1)
  content: string;
}

