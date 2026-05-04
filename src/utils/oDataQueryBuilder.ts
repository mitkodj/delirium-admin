export type ODataQuery = {
  top?: number
  skip?: number
  filter?: string
  orderBy?: string
  select?: string[]
  expand?: string[]
}

export function buildODataQuery(query: ODataQuery) {
  const params: Record<string, any> = {}

  if (query.top !== undefined) params.$top = query.top
  if (query.skip !== undefined) params.$skip = query.skip
  if (query.filter) params.$filter = query.filter
  if (query.orderBy) params.$orderby = query.orderBy
  if (query.select) params.$select = query.select.join(",")
  if (query.expand) params.$expand = query.expand.join(",")

  return params
}

export const eq = (field: string, value: string | number) =>
  `${field} eq '${value}'`

export const ge = (field: string, value: string | number) =>
  `${field} ge ${value}`

export const le = (field: string, value: string | number) =>
  `${field} le ${value}`

export const and = (...conditions: string[]) =>
  conditions.filter(Boolean).join(" and ")

export const or = (...conditions: string[]) =>
  conditions.filter(Boolean).join(" or ")