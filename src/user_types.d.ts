type Auction = {
    id: number,
    title: string,
    description: string,
    end_date: Date,
    image_filename: string,
    reserve: number,
    seller_id: number,
    category_id: number
}

type AuctionRequest = {
    q: string,
    categoryIds: number,
    sellerId: number,
    sortBy: string,
    count: number,
    startIndex: number,
    bidderId: number
}