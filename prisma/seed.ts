import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a default Teacher/Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      name: 'Admin User',
      password: 'password123', // Ensure you hash this if your app requires it!
      role: 'TEACHER', // or 'ADMIN'
      status: 'ACTIVE'
    },
  })

  // Create a default Class
  const mathClass = await prisma.studentClass.create({
    data: {
      name: 'Mathematics 101',
      // teacherId: admin.id // If your schema links classes to teachers
    }
  })

  console.log({ admin, mathClass })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })