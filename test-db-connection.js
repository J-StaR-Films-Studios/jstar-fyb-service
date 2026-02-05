const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test lead count
    const leadCount = await prisma.lead.count();
    console.log('📊 Total leads:', leadCount);
    
    // Test fetching leads
    const leads = await prisma.lead.findMany({ 
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 Recent leads:');
    leads.forEach((lead, index) => {
      console.log(`${index + 1}. ID: ${lead.id}, WhatsApp: ${lead.whatsapp}, Status: ${lead.status}, Created: ${lead.createdAt}`);
    });
    
    // Test stats queries (same as admin dashboard)
    const stats = {
      total: leadCount,
      newLeads: await prisma.lead.count({ where: { status: 'NEW' } }),
      soldLeads: await prisma.lead.count({ where: { status: { in: ['SOLD', 'PAID'] } } })
    };
    
    console.log('📈 Dashboard Stats:', stats);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testConnection();
