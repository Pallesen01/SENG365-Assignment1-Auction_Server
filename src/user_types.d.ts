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
}