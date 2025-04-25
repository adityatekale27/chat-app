import prisma from "@/libs/prismadb";
import { faker } from "@faker-js/faker";

/**
 * Generates a unique username based on user's full name
 */
const generateUniqueUsername = async (fullName: string) => {
  // Create a base username by removing spaces and converting to lowercase
  const baseName = fullName.toLowerCase().replace(/\s+/g, "");

  // Generate a random username using the first and last name
  let username = faker.internet
    .username({ firstName: fullName.split(" ")[0], lastName: fullName.split(" ")[1] })
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 3) {
    // Check if the generated username already exists in the database
    const existingUsername = await prisma.user.findUnique({ where: { username } });

    if (!existingUsername) {
      isUnique = true; // If username is unique, set isUnique to true
    } else {
      // If username exists, create a new one by adding a random number
      username = `${baseName}${faker.number.int({ min: 1, max: 9990 })}`;
    }

    attempts++;
  }

  // If still not unique after 3 attempts, use a fallback username
  if (!isUnique) {
    username = `${fullName.split(" ")[0]}_${Date.now()}`;
  }

  return username;
};

export default generateUniqueUsername;
