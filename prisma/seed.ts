import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@aimnesis.app'
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    console.log('Admin já existe')
    return
  }
  const password = await bcrypt.hash('Admin@123', 10)
  await prisma.user.create({
    data: {
      email,
      password,
      name: 'Administrador',
      role: 'admin',
      isVerified: true
    }
  })
  console.log('Admin criado:', email, '(senha: Admin@123)')
}

main().finally(() => prisma.$disconnect())