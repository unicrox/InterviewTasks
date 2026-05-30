"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Download, RefreshCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type PropertyRecord = {
  id: number
  squareFootage: number
  bedrooms: number
  bathrooms: number
  yearBuilt: number
  lotSize: number
  distanceToCityCenter: number
  schoolRating: number
  price: number
}

type MarketSummary = {
  totalProperties: number
  averagePrice: number
  minimumPrice: number
  maximumPrice: number
  averageSquareFootage: number
}

type FilterState = {
  bedrooms: string
  minPrice: string
  maxPrice: string
  sortBy: string
  sortDirection: string
}

type WhatIfFormState = {
  squareFootage: string
  bedrooms: string
  bathrooms: string
  yearBuilt: string
  lotSize: string
  distanceToCityCenter: string
  schoolRating: string
}

type WhatIfResponse = {
  predictedPrice: number
  status: string
}

const emptyFilters: FilterState = {
  bedrooms: "",
  minPrice: "",
  maxPrice: "",
  sortBy: "price",
  sortDirection: "desc",
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init })
  const payload = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: HTTP ${response.status}`)
  }

  return payload
}

export function AnalysisDashboard() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters)
  const [properties, setProperties] = useState<PropertyRecord[]>([])
  const [summary, setSummary] = useState<MarketSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null)
  const [whatIfForm, setWhatIfForm] = useState<WhatIfFormState | null>(null)
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null)
  const [whatIfError, setWhatIfError] = useState<string | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  const propertyQuery = useMemo(() => {
    const query = new URLSearchParams()

    if (appliedFilters.bedrooms) {
      query.set("bedrooms", appliedFilters.bedrooms)
    }

    if (appliedFilters.minPrice) {
      query.set("minPrice", appliedFilters.minPrice)
    }

    if (appliedFilters.maxPrice) {
      query.set("maxPrice", appliedFilters.maxPrice)
    }

    query.set("sortBy", appliedFilters.sortBy)
    query.set("sortDirection", appliedFilters.sortDirection)

    return query.toString()
  }, [appliedFilters])

  async function loadDashboard(query: string = propertyQuery) {
    setIsLoading(true)
    setError(null)

    try {
      const [nextSummary, nextProperties] = await Promise.all([
        requestJson<MarketSummary>("/api/market/summary"),
        requestJson<PropertyRecord[]>(`/api/market/properties?${query}`),
      ])

      setSummary(nextSummary)
      setProperties(nextProperties)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load market data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadMarketData() {
      try {
        const [nextSummary, nextProperties] = await Promise.all([
          requestJson<MarketSummary>("/api/market/summary"),
          requestJson<PropertyRecord[]>(`/api/market/properties?${propertyQuery}`),
        ])

        if (!cancelled) {
          setSummary(nextSummary)
          setProperties(nextProperties)
          setError(null)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load market data")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadMarketData()

    return () => {
      cancelled = true
    }
  }, [propertyQuery])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setAppliedFilters(filters)
  }

  function resetFilters() {
    setIsLoading(true)
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  function openWhatIfDialog(property: PropertyRecord) {
    setSelectedProperty(property)
    setWhatIfForm({
      squareFootage: String(property.squareFootage),
      bedrooms: String(property.bedrooms),
      bathrooms: String(property.bathrooms),
      yearBuilt: String(property.yearBuilt),
      lotSize: String(property.lotSize),
      distanceToCityCenter: String(property.distanceToCityCenter),
      schoolRating: String(property.schoolRating),
    })
    setWhatIfResult(null)
    setWhatIfError(null)
  }

  function closeWhatIfDialog() {
    setSelectedProperty(null)
    setWhatIfForm(null)
    setWhatIfResult(null)
    setWhatIfError(null)
  }

  function isWhatIfChanged(property: PropertyRecord, form: WhatIfFormState) {
    return (
      Number(form.squareFootage) !== property.squareFootage ||
      Number(form.bedrooms) !== property.bedrooms ||
      Number(form.bathrooms) !== property.bathrooms ||
      Number(form.yearBuilt) !== property.yearBuilt ||
      Number(form.lotSize) !== property.lotSize ||
      Number(form.distanceToCityCenter) !== property.distanceToCityCenter ||
      Number(form.schoolRating) !== property.schoolRating
    )
  }

  async function submitWhatIf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProperty || !whatIfForm) {
      return
    }

    if (!isWhatIfChanged(selectedProperty, whatIfForm)) {
      setWhatIfResult(null)
      setWhatIfError(
        "Change at least one feature before running what-if. The table price is real market data, so we do not replace it with a model prediction when nothing changed."
      )
      return
    }

    setIsPredicting(true)
    setWhatIfError(null)

    try {
      const result = await requestJson<WhatIfResponse>("/api/market/what-if", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          squareFootage: Number(whatIfForm.squareFootage),
          bedrooms: Number(whatIfForm.bedrooms),
          bathrooms: Number(whatIfForm.bathrooms),
          yearBuilt: Number(whatIfForm.yearBuilt),
          lotSize: Number(whatIfForm.lotSize),
          distanceToCityCenter: Number(whatIfForm.distanceToCityCenter),
          schoolRating: Number(whatIfForm.schoolRating),
        }),
      })

      setWhatIfResult(result)
    } catch (submitError) {
      setWhatIfResult(null)
      setWhatIfError(submitError instanceof Error ? submitError.message : "Failed to run what-if")
    } finally {
      setIsPredicting(false)
    }
  }

  const maxVisiblePrice = Math.max(0, ...properties.map((property) => property.price))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Market Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">Property market dashboard</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadDashboard()}
          disabled={isLoading}
        >
          <RefreshCw className={isLoading ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryMetric label="Properties" value={summary ? numberFormatter.format(summary.totalProperties) : "--"} />
        <SummaryMetric
          label="Average price"
          value={summary ? currencyFormatter.format(summary.averagePrice) : "--"}
        />
        <SummaryMetric
          label="Minimum price"
          value={summary ? currencyFormatter.format(summary.minimumPrice) : "--"}
        />
        <SummaryMetric
          label="Maximum price"
          value={summary ? currencyFormatter.format(summary.maximumPrice) : "--"}
        />
        <SummaryMetric
          label="Average size"
          value={summary ? `${numberFormatter.format(summary.averageSquareFootage)} sq ft` : "--"}
        />
      </div>

      <form
        className="grid gap-3 rounded-md border bg-background p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto]"
        onSubmit={applyFilters}
      >
        <label className="text-sm font-medium">
          Bedrooms
          <input
            className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            min="0"
            step="1"
            type="number"
            value={filters.bedrooms}
            onChange={(event) => setFilters((current) => ({ ...current, bedrooms: event.target.value }))}
          />
        </label>
        <label className="text-sm font-medium">
          Min price
          <input
            className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            min="0"
            step="1000"
            type="number"
            value={filters.minPrice}
            onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))}
          />
        </label>
        <label className="text-sm font-medium">
          Max price
          <input
            className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            min="0"
            step="1000"
            type="number"
            value={filters.maxPrice}
            onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
          />
        </label>
        <label className="text-sm font-medium">
          Sort by
          <select
            className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            value={filters.sortBy}
            onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}
          >
            <option value="price">Price</option>
            <option value="square_footage">Square footage</option>
            <option value="bedrooms">Bedrooms</option>
            <option value="school_rating">School rating</option>
            <option value="year_built">Year built</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Direction
          <select
            className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            value={filters.sortDirection}
            onChange={(event) => setFilters((current) => ({ ...current, sortDirection: event.target.value }))}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>
        <Button type="submit" className="self-end">
          Apply
        </Button>
        <Button type="button" variant="outline" className="self-end" onClick={resetFilters}>
          Reset
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Property Records</h2>
            <p className="mt-1 text-sm text-muted-foreground">{properties.length} records shown</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/api/market/export/csv" download>
                <Download />
                CSV
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/api/market/export/pdf" download>
                <Download />
                PDF
              </a>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border">
          <div className="hidden grid-cols-[4rem_1fr_5rem_5rem_6rem_10rem] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
            <span>ID</span>
            <span>Features</span>
            <span className="text-right">Year</span>
            <span className="text-right">School</span>
            <span className="text-right">Distance</span>
            <span>Price</span>
          </div>
          {properties.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground">
              {isLoading ? "Loading properties..." : "No properties found."}
            </div>
          ) : (
            <ul className="divide-y">
              {properties.map((property) => (
                <li
                  key={property.id}
                  className="grid cursor-pointer grid-cols-1 gap-2 px-4 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[4rem_1fr_5rem_5rem_6rem_10rem] sm:items-center sm:gap-4"
                  role="button"
                  tabIndex={0}
                  onClick={() => openWhatIfDialog(property)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openWhatIfDialog(property)
                    }
                  }}
                  aria-label={`Open what-if analysis for property ${property.id}`}
                >
                  <span className="font-medium">#{property.id}</span>
                  <span className="text-sm text-muted-foreground">
                    {numberFormatter.format(property.squareFootage)} sq ft / {property.bedrooms} bed /{" "}
                    {property.bathrooms} bath / lot {numberFormatter.format(property.lotSize)} sq ft
                  </span>
                  <span className="text-sm text-muted-foreground sm:text-right">{property.yearBuilt}</span>
                  <span className="text-sm text-muted-foreground sm:text-right">{property.schoolRating}</span>
                  <span className="text-sm text-muted-foreground sm:text-right">
                    {property.distanceToCityCenter} mi
                  </span>
                  <span className="flex items-center gap-2 font-medium sm:justify-end">
                    <span className="block h-2 w-20 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                        style={{
                          width: `${
                            maxVisiblePrice > 0
                              ? Math.round((property.price / maxVisiblePrice) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </span>
                    <span>{currencyFormatter.format(property.price)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {selectedProperty && whatIfForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="what-if-dialog-title"
            className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border bg-background shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 id="what-if-dialog-title" className="text-lg font-semibold">
                  What-if analysis
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Property #{selectedProperty.id} real price:{" "}
                  {currencyFormatter.format(selectedProperty.price)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeWhatIfDialog}
                disabled={isPredicting}
                aria-label="Close what-if dialog"
              >
                <X />
              </Button>
            </div>

            <form className="space-y-5 px-5 py-5" onSubmit={submitWhatIf}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Square footage{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {numberFormatter.format(selectedProperty.squareFootage)}
                  </span>
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.squareFootage}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, squareFootage: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Bedrooms{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {selectedProperty.bedrooms}
                  </span>
                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.bedrooms}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, bedrooms: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Bathrooms{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {selectedProperty.bathrooms}
                  </span>
                  <input
                    required
                    min="0"
                    step="0.5"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.bathrooms}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, bathrooms: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Year built{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {selectedProperty.yearBuilt}
                  </span>
                  <input
                    required
                    min="1800"
                    max="2100"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.yearBuilt}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, yearBuilt: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Lot size{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {numberFormatter.format(selectedProperty.lotSize)}
                  </span>
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.lotSize}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, lotSize: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Distance to city center{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {selectedProperty.distanceToCityCenter}
                  </span>
                  <input
                    required
                    min="0"
                    step="0.1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.distanceToCityCenter}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, distanceToCityCenter: event.target.value } : current
                      )
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  School rating{" "}
                  <span className="font-normal text-muted-foreground">
                    original: {selectedProperty.schoolRating}
                  </span>
                  <input
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={whatIfForm.schoolRating}
                    onChange={(event) =>
                      setWhatIfForm((current) =>
                        current ? { ...current, schoolRating: event.target.value } : current
                      )
                    }
                  />
                </label>
              </div>

              {whatIfError ? <p className="text-sm text-destructive">{whatIfError}</p> : null}
              {whatIfResult ? (
                <div className="grid gap-3 rounded-md border bg-muted/40 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Original market price</p>
                    <p className="mt-1 text-2xl font-semibold tracking-normal">
                      {currencyFormatter.format(selectedProperty.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Changed predicted price</p>
                    <p className="mt-1 text-2xl font-semibold tracking-normal">
                      {currencyFormatter.format(whatIfResult.predictedPrice)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeWhatIfDialog}
                  disabled={isPredicting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPredicting}>
                  {isPredicting ? "Estimating..." : "Run what-if"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  )
}
