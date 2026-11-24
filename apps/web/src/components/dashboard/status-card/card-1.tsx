import { KpiStripCard, type KpiStatItem } from '.'

type Period = 'week' | 'month' | 'quarter'

const COURSE_STATS_BY_PERIOD: Record<Period, KpiStatItem[]> = {
  week: [
    {
      id: 'enrollments',
      title: 'Active Enrollments',
      value: '1,284',
      changeText: '+8.4% vs last week',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last week',
      previousValue: '1,184',
    },
    {
      id: 'completion',
      title: 'Avg. Completion Time',
      value: '4.2 hrs',
      changeText: '-12.0% vs last week',
      trend: 'down',
      sentiment: 'good',
      previousLabel: 'Last week',
      previousValue: '4.8 hrs',
    },
    {
      id: 'pass-rate',
      title: 'Assessment Pass Rate',
      value: '86.5%',
      changeText: '+2.1% vs last week',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last week',
      previousValue: '84.4%',
    },
    {
      id: 'dropouts',
      title: 'Mid-Course Dropoffs',
      value: '6.3%',
      changeText: '+1.4% vs last week',
      trend: 'up',
      sentiment: 'bad',
      previousLabel: 'Last week',
      previousValue: '4.9%',
    },
    {
      id: 'lessons-done',
      title: 'Lessons Completed',
      value: '9,410',
      changeText: '+11.2% vs last week',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last week',
      previousValue: '8,462',
    },
  ],
  month: [
    {
      id: 'enrollments',
      title: 'Active Enrollments',
      value: '4,920',
      changeText: '+14.2% vs last month',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last month',
      previousValue: '4,308',
    },
    {
      id: 'completion',
      title: 'Avg. Completion Time',
      value: '4.5 hrs',
      changeText: '-6.2% vs last month',
      trend: 'down',
      sentiment: 'good',
      previousLabel: 'Last month',
      previousValue: '4.8 hrs',
    },
    {
      id: 'pass-rate',
      title: 'Assessment Pass Rate',
      value: '84.9%',
      changeText: '+1.5% vs last month',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last month',
      previousValue: '83.4%',
    },
    {
      id: 'dropouts',
      title: 'Mid-Course Dropoffs',
      value: '5.8%',
      changeText: '-0.9% vs last month',
      trend: 'down',
      sentiment: 'good',
      previousLabel: 'Last month',
      previousValue: '6.7%',
    },
    {
      id: 'lessons-done',
      title: 'Lessons Completed',
      value: '38,120',
      changeText: '+19.0% vs last month',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last month',
      previousValue: '32,033',
    },
  ],
  quarter: [
    {
      id: 'enrollments',
      title: 'Active Enrollments',
      value: '14,150',
      changeText: '+22.6% vs last quarter',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last quarter',
      previousValue: '11,541',
    },
    {
      id: 'completion',
      title: 'Avg. Completion Time',
      value: '4.1 hrs',
      changeText: '-14.5% vs last quarter',
      trend: 'down',
      sentiment: 'good',
      previousLabel: 'Last quarter',
      previousValue: '4.8 hrs',
    },
    {
      id: 'pass-rate',
      title: 'Assessment Pass Rate',
      value: '88.0%',
      changeText: '+4.2% vs last quarter',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last quarter',
      previousValue: '83.8%',
    },
    {
      id: 'dropouts',
      title: 'Mid-Course Dropoffs',
      value: '5.1%',
      changeText: '-1.8% vs last quarter',
      trend: 'down',
      sentiment: 'good',
      previousLabel: 'Last quarter',
      previousValue: '6.9%',
    },
    {
      id: 'lessons-done',
      title: 'Lessons Completed',
      value: '112,840',
      changeText: '+27.4% vs last quarter',
      trend: 'up',
      sentiment: 'good',
      previousLabel: 'Last quarter',
      previousValue: '88,570',
    },
  ],
}

export function CourseAnalyticsOverview() {
  return (
    <KpiStripCard
      title="Learning Operations"
      description={(period) =>
        `Key learner metrics compared with last ${period}`
      }
      items={(period) => COURSE_STATS_BY_PERIOD[period]}
      columns={5}
    />
  )
}
