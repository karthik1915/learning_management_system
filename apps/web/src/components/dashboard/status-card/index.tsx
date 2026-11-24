import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import * as React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { cn } from '#/lib/utils'

export type KpiTrend = 'up' | 'down' | 'flat'
export type KpiSentiment = 'good' | 'bad' | 'neutral'

export interface KpiPeriodOption<TPeriod extends string = string> {
  value: TPeriod
  label: string
}

export interface KpiStatItem {
  id: string
  title: string
  value: React.ReactNode
  changeText?: string
  trend?: KpiTrend
  sentiment?: KpiSentiment
  previousValue?: React.ReactNode
  previousLabel?: string
}

export interface KpiStripCardProps<
  TPeriod extends string = 'week' | 'month' | 'quarter',
> {
  title: string
  description?: string | ((period: TPeriod) => string)
  periods?: readonly KpiPeriodOption<TPeriod>[]
  period?: TPeriod
  onPeriodChange?: (period: TPeriod) => void
  defaultPeriod?: TPeriod
  items: KpiStatItem[] | ((period: TPeriod) => KpiStatItem[])
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  headerClassName?: string
  gridClassName?: string
}

const DEFAULT_PERIODS: readonly KpiPeriodOption<
  'week' | 'month' | 'quarter'
>[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

const COLUMN_CLASSES: Record<
  NonNullable<KpiStripCardProps['columns']>,
  string
> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
}

const SENTIMENT_CLASSES: Record<KpiSentiment, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-muted-foreground',
}

function TrendIcon({ trend }: { trend?: KpiTrend }) {
  if (trend === 'up') {
    return <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
  }
  if (trend === 'down') {
    return <ArrowDownRight className="size-3.5 shrink-0" aria-hidden="true" />
  }
  return <Minus className="size-3.5 shrink-0" aria-hidden="true" />
}

export function KpiStripCard<
  TPeriod extends string = 'week' | 'month' | 'quarter',
>({
  title,
  description,
  periods = DEFAULT_PERIODS as unknown as readonly KpiPeriodOption<TPeriod>[],
  period: controlledPeriod,
  onPeriodChange,
  defaultPeriod,
  items,
  columns = 5,
  className,
  headerClassName,
  gridClassName,
}: KpiStripCardProps<TPeriod>) {
  const initialPeriod =
    controlledPeriod ?? defaultPeriod ?? periods[0]?.value ?? ('' as TPeriod)

  const [uncontrolledPeriod, setUncontrolledPeriod] =
    React.useState<TPeriod>(initialPeriod)

  const activePeriod = controlledPeriod ?? uncontrolledPeriod

  const handleSelectPeriod = (next: TPeriod) => {
    if (controlledPeriod === undefined) {
      setUncontrolledPeriod(next)
    }
    onPeriodChange?.(next)
  }

  const resolvedDescription =
    typeof description === 'function' ? description(activePeriod) : description

  const resolvedItems =
    typeof items === 'function' ? items(activePeriod) : items

  const gridCols =
    columns ??
    (Math.min(Math.max(resolvedItems.length, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6)

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'border-border overflow-hidden py-0 gap-0 shadow-xs mb-4',
          className,
        )}
      >
        <CardHeader
          className={cn(
            'border-border flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between',
            headerClassName,
          )}
        >
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight">
              {title}
            </CardTitle>
            {resolvedDescription ? (
              <CardDescription className="text-xs sm:text-sm">
                {resolvedDescription}
              </CardDescription>
            ) : null}
          </div>

          {periods.length > 0 ? (
            <div
              role="group"
              aria-label={`${title} time range`}
              className="border-border bg-muted/40 inline-flex w-fit items-center rounded-lg border p-0.5"
            >
              {periods.map((option) => {
                const isActive = option.value === activePeriod
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectPeriod(option.value)}
                    aria-pressed={isActive}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'border-border bg-background text-foreground border shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground border border-transparent',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          <div
            className={cn(
              'divide-border grid divide-y sm:divide-y-0 sm:divide-x',
              COLUMN_CLASSES[gridCols],
              gridClassName,
            )}
          >
            {resolvedItems.map((item) => {
              const sentiment = item.sentiment ?? 'neutral'
              const hasTooltip = item.previousValue !== undefined

              const statBody = (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">
                    {item.title}
                  </p>
                  <div className="text-2xl font-semibold tracking-tight tabular-nums">
                    {item.value}
                  </div>
                  {item.changeText || item.trend ? (
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        SENTIMENT_CLASSES[sentiment],
                      )}
                    >
                      {item.trend ? <TrendIcon trend={item.trend} /> : null}
                      {item.changeText ? <span>{item.changeText}</span> : null}
                    </div>
                  ) : null}
                </div>
              )

              return (
                <div key={item.id} className="p-5">
                  {hasTooltip ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="w-fit cursor-default">{statBody}</div>
                        }
                      />
                      <TooltipContent side="bottom">
                        <p className="text-xs">
                          {item.previousLabel ?? 'Previous'}:{' '}
                          <span className="font-semibold tabular-nums">
                            {item.previousValue}
                          </span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    statBody
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
