import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@ValidatorConstraint({ name: 'isEmailUnique', async: true })
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
  async validate(email: string): Promise<boolean> {
    if (!email) {
      return true; // Let @IsEmail handle empty values
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      return !user; // Return true if email doesn't exist (is unique)
    } catch (error) {
      // If database error, return false to fail validation
      return false;
    }
  }

  defaultMessage(): string {
    return 'Email already exists';
  }
}

export function IsEmailUnique(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailUniqueConstraint,
    });
  };
}

