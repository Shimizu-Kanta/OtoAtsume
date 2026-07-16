export type Paginated<T> = {
  items: T[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export function paginate<T>(
  items: T[],
  totalCount: number,
  page: number,
  perPage: number
): Paginated<T> {
  return {
    items,
    totalCount,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage))
  };
}

export function pageSkip(page: number, perPage: number) {
  return (page - 1) * perPage;
}
