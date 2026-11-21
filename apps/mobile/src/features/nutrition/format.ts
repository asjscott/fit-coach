// How the Food tab writes amounts, in the phone's locale: kcal and targets whole ("2,406"), grams to a tenth ("12.6")
export const wholeNumber = (value: number) => Math.round(value).toLocaleString();

export const oneDecimal = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
