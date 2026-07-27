import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_CATEGORIES = [
    "Food",
    "Shopping",
    "Grocery",
    "Transport",
    "Medical",
    "Entertainment",
    "Bills",
    "Education",
    "Travel",
    "Recharge",
    "Investment",
    "Salary",
    "Rent",
    "Utilities",
    "Insurance",
    "Others"
];

export async function predictCategories(transactions) {

    // transactions = [
    // {
    //      id:1,
    //      merchant:"Swiggy",
    //      description:"UPI Payment",
    //      amount:450
    // }
    // ]

    const prompt = `
You are an intelligent finance assistant.

Categorize each transaction.

Allowed Categories:

${ALLOWED_CATEGORIES.join(", ")}

Transactions:

${JSON.stringify(transactions, null, 2)}

Return ONLY JSON.

Example:

[
    {
        "id":1,
        "category":"Food",
        "confidence":99,
        "reason":"Food delivery"
    }
]
`;

    try {

        const response = await client.responses.create({
            model: "gpt-5-mini",
            input: prompt
        });

        return JSON.parse(response.output_text);

    } catch (err) {

        console.log(err);

        return [];
    }
}