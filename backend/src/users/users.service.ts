import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
}

// Fields safe to return to the client — never passwordHash.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  city: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  create(input: CreateUserInput) {
    return this.prisma.user.create({ data: input });
  }

  updateProfile(id: string, data: { fullName?: string; phone?: string; city?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data, select: PUBLIC_USER_SELECT });
  }
}
