import getSession from "./getSession";
import prisma from "@/libs/prismadb";

const getCurrentUser = async () => {
  try {
    // Get the current user session
    const session = await getSession();

    // If there's no session or user ID, return null
    if (!session?.user?.id) return null;

    // Fetch the user from the database using the session user ID
    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.user.id as string,
      },
    });

    // If user not found, return null
    if (!currentUser) return null;

    return currentUser;
  } catch (error) {
    console.error("getCurrentUser error::", error);
  }
};

export default getCurrentUser;
