import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/actions/getCurrentUser";

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  image: true,
};

/* Shuffle all users */
const shuffleArray = <A>(array: A[]): A[] => {
  if (array.length === 0) return [];
  const shuffledArray = [...array];

  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[randomIndex]] = [shuffledArray[randomIndex], shuffledArray[i]];
  }

  return shuffledArray;
};

/*
  GET method to fetch all users available on the platform, 
  also show users based on serach term if available
*/
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    /* Get the url */
    const { searchParams } = new URL(request.url);

    // lastUserId as pagination pointer and search query for searching user
    const lastUserId = searchParams.get("lastUserId");
    const searchQuery = searchParams.get("search");

    // Check values are valid or not
    if (lastUserId && typeof lastUserId !== "string") {
      return NextResponse.json({ message: "Invalid lastUserId" }, { status: 400 });
    }

    /* Fetch 50 users at a time */
    let users = await prisma.user.findMany({
      where: {
        AND: {
          NOT: { id: currentUser.id },
          ...(searchQuery && {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { email: { contains: searchQuery, mode: "insensitive" } },
              { username: { contains: searchQuery, mode: "insensitive" } },
            ],
          }),
        },
      },

      select: userSelect,
      take: 50,
      orderBy: { id: "asc" },
      // if lastUserId present then skip that record
      ...(lastUserId ? { skip: 1, cursor: { id: lastUserId } } : {}),
    });

    // If serach query does not present then shuffle users
    if (!searchQuery) {
      users = shuffleArray(users);
    }

    // If fetched 50 users, assign the id of last user tas the pointer (lastUserId) for next page
    const newLastUserId = users.length === 50 ? users[49].id : null;

    return NextResponse.json({ users, lastUserId: newLastUserId }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users error", error);
    return NextResponse.json({ message: "Failed to get users" }, { status: 500 });
  }
}
