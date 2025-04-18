import getSession from "./getSession";
import prisma from "@/libs/prismadb";

const getCurrentUser = async () => {
  try {
    const session = await getSession();

    if (!session?.user?.id) return null;

    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.user.id as string,
      },
    });

    if (!currentUser) return null;

    return currentUser;
  } catch (error) {
    console.log("getCurrentUser error::", error);
  }
};

export default getCurrentUser;
