import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function seed() {
  const participant = await prisma.participant.findFirst();
  if (!participant) {
    console.log("No participants found.");
    return;
  }
  
  const paymentInfo = await prisma.paymentInfo.create({
    data: {
      participantId: participant.id,
      bankBIN: "970422", // MB Bank
      accountNumber: "0123456789",
      accountName: "NGUYEN VAN A",
    }
  });
  console.log("Created PaymentInfo for participant:", participant.id);
  console.log(paymentInfo);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
