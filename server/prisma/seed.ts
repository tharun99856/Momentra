import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@frame.dev' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@frame.dev',
      passwordHash: adminHash,
      globalRole: 'admin',
    },
  })

  // Create demo users
  const demoHash = await bcrypt.hash('password123', 12)
  const photographer = await prisma.user.upsert({
    where: { email: 'photographer@frame.dev' },
    update: {},
    create: {
      username: 'alex_shoots',
      email: 'photographer@frame.dev',
      passwordHash: demoHash,
      globalRole: 'user',
    },
  })

  const member = await prisma.user.upsert({
    where: { email: 'member@frame.dev' },
    update: {},
    create: {
      username: 'jamie_m',
      email: 'member@frame.dev',
      passwordHash: demoHash,
      globalRole: 'user',
    },
  })

  // Create a club
  const club = await prisma.club.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'University Photography Club',
      description: 'Capturing campus life one frame at a time',
      createdBy: admin.id,
    },
  })

  // Add members to club
  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId: club.id, userId: admin.id } },
    update: {},
    create: { clubId: club.id, userId: admin.id, role: 'admin' },
  })

  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId: club.id, userId: photographer.id } },
    update: {},
    create: { clubId: club.id, userId: photographer.id, role: 'photographer' },
  })

  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId: club.id, userId: member.id } },
    update: {},
    create: { clubId: club.id, userId: member.id, role: 'member' },
  })

  // Create events
  const events = [
    { name: 'Annual Photography Exhibition', category: 'cultural' as const, date: new Date('2026-05-15'), location: 'Main Auditorium', visibility: 'public' as const, description: 'Showcasing the best student photography from this year' },
    { name: 'Sports Day 2026', category: 'sports' as const, date: new Date('2026-04-20'), location: 'University Ground', visibility: 'public' as const, description: 'Annual inter-department sports competition' },
    { name: 'AI Workshop', category: 'workshop' as const, date: new Date('2026-06-01'), location: 'Lab 301', visibility: 'public' as const, description: 'Introduction to AI and machine learning for photographers' },
    { name: 'Goa Trip', category: 'trip' as const, date: new Date('2026-03-10'), location: 'Goa, India', visibility: 'private' as const, description: 'Club trip to Goa — members only' },
    { name: 'Freshers Party 2026', category: 'party' as const, date: new Date('2026-08-15'), location: 'Student Center', visibility: 'public' as const, description: 'Welcome party for new students' },
    { name: 'Code & Click Hackathon', category: 'hackathon' as const, date: new Date('2026-07-01'), location: 'Innovation Hub', visibility: 'public' as const, description: '24-hour hackathon combining photography and code' },
  ]

  for (const eventData of events) {
    await prisma.event.upsert({
      where: { id: `event-${eventData.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}` },
      update: {},
      create: {
        clubId: club.id,
        createdBy: admin.id,
        ...eventData,
      },
    })
  }

  console.log('Seed complete!')
  console.log('')
  console.log('Demo accounts:')
  console.log('  Admin:        admin@frame.dev / admin123')
  console.log('  Photographer: photographer@frame.dev / password123')
  console.log('  Member:       member@frame.dev / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
