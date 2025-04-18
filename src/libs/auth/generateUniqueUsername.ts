import prisma from "@/libs/prismadb";
import { faker } from "@faker-js/faker"; // install with: npm i @faker-js/faker

/**
 * Generates a unique username based on user's full name
 */
const generateUniqueUsername = async (fullName: string) => {
  const baseName = fullName.toLowerCase().replace(/\s+/g, "");

  let username = faker.internet
    .username({ firstName: fullName.split(" ")[0], lastName: fullName.split(" ")[1] })
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 3) {
    const existingUsername = await prisma.user.findUnique({ where: { username } });

    if (!existingUsername) {
      isUnique = true;
    } else {
      username = `${baseName}${faker.number.int({ min: 1, max: 9990 })}`;
    }

    attempts++;
  }

  if (!isUnique) {
    username = `${fullName.split(" ")[0]}_${Date.now()}`;
  }

  return username;
};

export default generateUniqueUsername;
