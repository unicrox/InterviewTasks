"use client"

import { Edit, GitCompareArrows, Plus, RefreshCw, X } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

type EstimateRecord = {
  id: string
  label: string | null
  features: {
    square_footage: number
    bedrooms: number
    bathrooms: number
    year_built: number
    lot_size: number
    distance_to_city_center: number
    school_rating: number
  }
  predicted_price: number | null
  created_at: string
}

type EstimateListResponse = {
  items: EstimateRecord[]
  count: number
}

type EstimateFormState = {
  label: string
  square_footage: string
  bedrooms: string
  bathrooms: string
  year_built: string
  lot_size: string
  distance_to_city_center: string
  school_rating: string
}

const emptyFormState: EstimateFormState = {
  label: "",
  square_footage: "",
  bedrooms: "",
  bathrooms: "",
  year_built: "",
  lot_size: "",
  distance_to_city_center: "",
  school_rating: "",
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const maxCompareSelections = 5

async function requestEstimates() {
  const response = await fetch("/api/estimates", { cache: "no-store" })
  const payload = (await response.json()) as Partial<EstimateListResponse> & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to load estimates: HTTP ${response.status}`)
  }

  return {
    items: payload.items ?? [],
    count: payload.count ?? 0,
  }
}

export function EstimateHistory() {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([])
  const [estimateCount, setEstimateCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false)
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null)
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([])
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState<EstimateFormState>(emptyFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function loadEstimates() {
    setIsLoading(true)
    setLoadError(null)

    try {
      const payload = await requestEstimates()
      setEstimates(payload.items)
      setEstimateCount(payload.count)
      setSelectedEstimateIds((current) =>
        current.filter((estimateId) => payload.items.some((estimate) => estimate.id === estimateId))
      )
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to connect to backend")
    } finally {
      setIsLoading(false)
    }
  }

  function openAddDialog() {
    setSelectedEstimate(null)
    setFormState(emptyFormState)
    setFormError(null)
    setIsDialogOpen(true)
  }

  function openEditDialog(estimate: EstimateRecord) {
    setSelectedEstimate(estimate)
    setFormState({
      label: estimate.label ?? "",
      square_footage: String(estimate.features.square_footage),
      bedrooms: String(estimate.features.bedrooms),
      bathrooms: String(estimate.features.bathrooms),
      year_built: String(estimate.features.year_built),
      lot_size: String(estimate.features.lot_size),
      distance_to_city_center: String(estimate.features.distance_to_city_center),
      school_rating: String(estimate.features.school_rating),
    })
    setFormError(null)
    setIsDialogOpen(true)
  }

  function toggleEstimateSelection(estimateId: string, isSelected: boolean) {
    setSelectedEstimateIds((current) => {
      if (isSelected) {
        if (current.length >= maxCompareSelections && !current.includes(estimateId)) {
          setSelectionMessage("You can only select five properties to compare.")
          return current
        }

        setSelectionMessage(null)
        return current.includes(estimateId) ? current : [...current, estimateId]
      }

      setSelectionMessage(null)
      return current.filter((selectedEstimateId) => selectedEstimateId !== estimateId)
    })
  }

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const payload = {
      label: formState.label.trim() || null,
      features: {
        square_footage: Number(formState.square_footage),
        bedrooms: Number(formState.bedrooms),
        bathrooms: Number(formState.bathrooms),
        year_built: Number(formState.year_built),
        lot_size: Number(formState.lot_size),
        distance_to_city_center: Number(formState.distance_to_city_center),
        school_rating: Number(formState.school_rating),
      },
    }

    try {
      const response = await fetch(
        selectedEstimate ? `/api/estimates/${selectedEstimate.id}` : "/api/estimates",
        {
          method: selectedEstimate ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setFormError(result.error ?? `Failed to save estimate: HTTP ${response.status}`)
        return
      }

      setIsDialogOpen(false)
      setSelectedEstimate(null)
      setFormState(emptyFormState)
      await loadEstimates()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to connect to backend")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialEstimates() {
      try {
        const payload = await requestEstimates()

        if (!cancelled) {
          setEstimates(payload.items)
          setEstimateCount(payload.count)
          setSelectedEstimateIds((current) =>
            current.filter((estimateId) =>
              payload.items.some((estimate) => estimate.id === estimateId)
            )
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to connect to backend")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialEstimates()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectionMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSelectionMessage(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [selectionMessage])

  const compareEstimates = selectedEstimateIds
    .map((estimateId) => estimates.find((estimate) => estimate.id === estimateId))
    .filter((estimate): estimate is EstimateRecord => Boolean(estimate))

  const maxPredictedPrice = Math.max(
    0,
    ...estimates
      .map((estimate) => estimate.predicted_price ?? 0)
      .filter((predictedPrice) => predictedPrice > 0)
  )

  const compareRows = [
    {
      label: "Predicted price",
      values: compareEstimates.map((estimate) =>
        estimate.predicted_price === null
          ? "Not available"
          : currencyFormatter.format(estimate.predicted_price)
      ),
    },
    {
      label: "Square footage",
      values: compareEstimates.map((estimate) =>
        `${estimate.features.square_footage.toLocaleString()} sq ft`
      ),
    },
    {
      label: "Bedrooms",
      values: compareEstimates.map((estimate) => estimate.features.bedrooms.toLocaleString()),
    },
    {
      label: "Bathrooms",
      values: compareEstimates.map((estimate) => estimate.features.bathrooms.toLocaleString()),
    },
    {
      label: "Year built",
      values: compareEstimates.map((estimate) => String(estimate.features.year_built)),
    },
    {
      label: "Lot size",
      values: compareEstimates.map((estimate) =>
        `${estimate.features.lot_size.toLocaleString()} sq ft`
      ),
    },
    {
      label: "Distance to city center",
      values: compareEstimates.map(
        (estimate) => `${estimate.features.distance_to_city_center.toLocaleString()} mi`
      ),
    },
    {
      label: "School rating",
      values: compareEstimates.map((estimate) => estimate.features.school_rating.toLocaleString()),
    },
  ]

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Estimator</h1>
          <p className="mt-1 text-sm text-muted-foreground">Estimate history</p>
          {selectionMessage ? (
            <p className="mt-2 text-sm text-destructive">{selectionMessage}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{estimateCount} estimates</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadEstimates()}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "animate-spin" : undefined} />
            Refresh
          </Button>
          {selectedEstimateIds.length >= 2 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompareDialogOpen(true)}
            >
              <GitCompareArrows />
              Compare
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={openAddDialog}
          >
            <Plus />
            Add
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="hidden grid-cols-[2rem_11rem_1fr_8rem_7rem_5rem] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
          <span aria-hidden="true" />
          <span>Property</span>
          <span>Features</span>
          <span className="text-right">Estimate</span>
          <span className="text-right">Status</span>
          <span className="text-right">Action</span>
        </div>

        {isLoading && estimates.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Loading estimates...</div>
        ) : loadError ? (
          <div className="px-4 py-10 text-sm text-destructive">{loadError}</div>
        ) : estimates.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">No estimates yet.</div>
        ) : (
          <ul className="divide-y">
            {estimates.map((estimate) => (
              <li
                key={estimate.id}
                className="grid grid-cols-[2rem_1fr] gap-3 px-4 py-4 sm:grid-cols-[2rem_11rem_1fr_8rem_7rem_5rem] sm:items-center sm:gap-4"
              >
                <div className="pt-1 sm:pt-0">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border accent-primary"
                    checked={selectedEstimateIds.includes(estimate.id)}
                    onChange={(event) =>
                      toggleEstimateSelection(estimate.id, event.target.checked)
                    }
                    aria-label={`Select ${estimate.label ?? `estimate ${estimate.id.slice(0, 8)}`}`}
                  />
                </div>
                <div>
                  <h2 className="font-medium">
                    {estimate.label ?? `Estimate ${estimate.id.slice(0, 8)}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(estimate.created_at).toLocaleString("sv-SE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>

                <div className="col-start-2 sm:col-start-auto">
                  <p className="mt-1 text-sm text-muted-foreground">
                    {estimate.features.square_footage.toLocaleString()} sq ft /{" "}
                    {estimate.features.bedrooms} bed / {estimate.features.bathrooms} bath / built{" "}
                    {estimate.features.year_built}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lot {estimate.features.lot_size.toLocaleString()} sq ft /{" "}
                    {estimate.features.distance_to_city_center.toLocaleString()} mi from center /{" "}
                    school {estimate.features.school_rating.toLocaleString()}
                  </p>
                </div>

                <div className="col-start-2 sm:col-start-auto">
                  {estimate.predicted_price === null ? (
                    <span className="font-medium">Not available</span>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="font-medium">
                        {currencyFormatter.format(estimate.predicted_price)}
                      </span>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        aria-label={`${currencyFormatter.format(
                          estimate.predicted_price
                        )} relative predicted price`}
                        role="img"
                      >
                        <div
                          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                          style={{
                            width: `${
                              maxPredictedPrice > 0
                                ? Math.max(
                                    8,
                                    Math.round((estimate.predicted_price / maxPredictedPrice) * 100)
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-start-2 text-sm text-muted-foreground sm:col-start-auto sm:text-right">
                  {estimate.predicted_price === null ? "Pending" : "Completed"}
                </div>
                <div className="col-start-2 sm:col-start-auto sm:text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(estimate)}
                  >
                    <Edit />
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="estimate-dialog-title"
            className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border bg-background shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 id="estimate-dialog-title" className="text-lg font-semibold">
                  {selectedEstimate ? "Edit estimate" : "Add estimate"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedEstimate
                    ? "Update the property information and save a new prediction."
                    : "Enter property information to create a prediction."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
                aria-label="Close dialog"
              >
                <X />
              </Button>
            </div>

            <form className="space-y-5 px-5 py-5" onSubmit={submitEstimate}>
              <label className="block text-sm font-medium">
                Label
                <input
                  className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                  value={formState.label}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Square footage
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.square_footage}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        square_footage: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Bedrooms
                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.bedrooms}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, bedrooms: event.target.value }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Bathrooms
                  <input
                    required
                    min="0"
                    step="0.5"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.bathrooms}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, bathrooms: event.target.value }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Year built
                  <input
                    required
                    min="1800"
                    max="2100"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.year_built}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, year_built: event.target.value }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Lot size
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.lot_size}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, lot_size: event.target.value }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  Distance to city center
                  <input
                    required
                    min="0"
                    step="0.1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.distance_to_city_center}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        distance_to_city_center: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block text-sm font-medium">
                  School rating
                  <input
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    type="number"
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                    value={formState.school_rating}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        school_rating: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : selectedEstimate ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCompareDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-dialog-title"
            className="max-h-[calc(100svh-2rem)] w-full max-w-5xl overflow-hidden rounded-md border bg-background shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 id="compare-dialog-title" className="text-lg font-semibold">
                  Compare estimates
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {compareEstimates.length} selected properties
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsCompareDialogOpen(false)}
                aria-label="Close compare dialog"
              >
                <X />
              </Button>
            </div>

            <div className="overflow-auto px-5 py-5">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="w-44 px-3 py-3">Feature</th>
                    {compareEstimates.map((estimate) => (
                      <th key={estimate.id} className="min-w-40 px-3 py-3">
                        <span className="block font-medium text-foreground">
                          {estimate.label ?? `Estimate ${estimate.id.slice(0, 8)}`}
                        </span>
                        <span className="mt-1 block font-normal text-muted-foreground">
                          {estimate.id.slice(0, 8)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                        {row.label}
                      </th>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${compareEstimates[index]?.id}`} className="px-3 py-3">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
