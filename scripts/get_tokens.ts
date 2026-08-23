import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function run() {
  const participants = await prisma.participant.findMany({ take: 2 });
  console.log(participants);
}

run();
