type Auction = {
    auctionId: number,
    title: string,
    description: string,
    endDate: Date,
    imageFilename: string,
    reserve: number,
    sellerId: number,
    categoryId: number,
    numBids: number
}

type Category = {
    id: number,
    name: string
}

type User = {
    userId: number,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    currentPassword: string,
    authToken: string
    imageFilename: string
}

type Bid = {
    bidderId: number,
    amount: number,
    firstName: string,
    lastName: string,
    timestamp: string
}