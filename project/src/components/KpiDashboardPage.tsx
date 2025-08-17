import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Doc } from '../../convex/_generated/dataModel';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale, // Import TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import the date adapter
import { Download } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale, // Register TimeScale
  Title,
  Tooltip,
  Legend
);

const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert("No data to export.");
    return;
  }
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const csvContent = `data:text/csv;charset=utf-8,${header}\n${rows}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


interface KpiDashboardPageProps {
  currentUser?: any;
}

export default function KpiDashboardPage({ currentUser }: KpiDashboardPageProps) {
  const mocRequests = useQuery(api.moc.listRequests, 
    currentUser?._id ? { 
      statusFilter: undefined,
      requestingUserId: currentUser._id
    } : "skip"
  ) || [];
  const departments = useQuery(api.departments.listDepartments) || [];

  const kpiData = useMemo(() => {
    if (!mocRequests.length || !departments.length) {
      return {
        totalRfcs: 0,
        rfcsByStatus: {},
        rfcsByDepartment: {},
        rfcsOverTime: [],
        averageCompletionTime: 0, // in days
      };
    }

    const totalRfcs = mocRequests.length;

    const rfcsByStatus: Record<string, number> = mocRequests.reduce((acc, moc) => {
      acc[moc.status] = (acc[moc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rfcsByDepartment: Record<string, number> = mocRequests.reduce((acc, moc) => {
      const deptId = moc.requestedByDepartment;
      if (deptId) {
        const dept = departments.find(d => d._id === deptId);
        const deptName = dept?.name || 'Unknown Department';
        acc[deptName] = (acc[deptName] || 0) + 1;
      } else {
        acc['Unassigned Department'] = (acc['Unassigned Department'] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const rfcsOverTime = mocRequests
      .map(moc => ({
        date: new Date(moc._creationTime), // Ensure this is a Date object
        count: 1,
      }))
      .sort((a,b) => a.date.getTime() - b.date.getTime()) // Sort by date
      .reduce((acc, curr) => { // Aggregate counts per day
        const dateStr = curr.date.toISOString().split('T')[0];
        const existing = acc.find(item => item.x === dateStr);
        if (existing) {
          existing.y += 1;
        } else {
          acc.push({ x: dateStr, y: 1 });
        }
        return acc;
      }, [] as {x: string, y: number}[]);


    const completedRfcs = mocRequests.filter(moc => moc.status === 'completed' && moc.submittedAt && moc.reviewedAt);
    const totalCompletionTime = completedRfcs.reduce((sum, moc) => {
        const duration = (moc.reviewedAt! - moc.submittedAt!) / (1000 * 60 * 60 * 24); // days
        return sum + duration;
    }, 0);
    const averageCompletionTime = completedRfcs.length > 0 ? parseFloat((totalCompletionTime / completedRfcs.length).toFixed(1)) : 0;


    return {
      totalRfcs,
      rfcsByStatus,
      rfcsByDepartment,
      rfcsOverTime,
      averageCompletionTime,
    };
  }, [mocRequests, departments]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '', // Will be set per chart
      },
    },
  };

  const statusChartData = {
    labels: Object.keys(kpiData.rfcsByStatus).map(s => s.replace(/_/g, ' ')),
    datasets: [
      {
        label: 'RFCs by Status',
        data: Object.values(kpiData.rfcsByStatus),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(100, 159, 64, 0.7)',
        ],
      },
    ],
  };

  const departmentChartData = {
    labels: Object.keys(kpiData.rfcsByDepartment),
    datasets: [
      {
        label: 'RFCs by Department',
        data: Object.values(kpiData.rfcsByDepartment),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      },
    ],
  };
  
  const rfcsOverTimeChartData = {
    datasets: [
      {
        label: 'RFC Creation Over Time',
        data: kpiData.rfcsOverTime,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const rfcsOverTimeChartOptions = {
    ...chartOptions,
    scales: {
      x: {
        type: 'time' as const, // Specify scale type
        time: {
          unit: 'day' as const, // Display unit
           tooltipFormat: 'MMM dd, yyyy' as const,
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of RFCs Created'
        }
      }
    }
  };


  const StatCard: React.FC<{ title: string; value: string | number; icon?: React.ReactNode; color?: string }> = 
  ({ title, value, icon, color = "bg-primary" }) => (
    <div className={`p-5 rounded-xl shadow-lg text-white ${color}`}>
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm opacity-90">{title}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">KPI Dashboard</h1>

      {/* Overview Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total RFC Requests" value={kpiData.totalRfcs} color="bg-blue-500" />
        <StatCard title="Pending Approval (Dept & Final)" value={(kpiData.rfcsByStatus.pending_department_approval || 0) + (kpiData.rfcsByStatus.pending_final_review || 0)} color="bg-yellow-500" />
        <StatCard title="Avg. Completion Time (Days)" value={kpiData.averageCompletionTime > 0 ? kpiData.averageCompletionTime : "N/A"} color="bg-green-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-secondary-dark">RFCs by Status</h2>
            <button 
              onClick={() => exportToCSV(Object.entries(kpiData.rfcsByStatus).map(([status, count]) => ({ status: status.replace(/_/g, ' '), count })), 'rfcs_by_status')}
              className="btn btn-outline-secondary btn-sm flex items-center gap-1"
            >
              <Download size={16} /> Export
            </button>
          </div>
          <div style={{ height: '300px' }}>
            <Pie data={statusChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'RFC Distribution by Status' } } }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-secondary-dark">RFCs by Requesting Department</h2>
            <button 
              onClick={() => exportToCSV(Object.entries(kpiData.rfcsByDepartment).map(([department, count]) => ({ department, count })), 'rfcs_by_department')}
              className="btn btn-outline-secondary btn-sm flex items-center gap-1"
            >
              <Download size={16} /> Export
            </button>
          </div>
          <div style={{ height: '300px' }}>
            <Bar data={departmentChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'RFC Count per Department' } } }} />
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-dark">RFC Creation Over Time</h2>
           <button 
              onClick={() => exportToCSV(kpiData.rfcsOverTime.map(d => ({ date: d.x, count: d.y })), 'rfcs_creation_over_time')}
              className="btn btn-outline-secondary btn-sm flex items-center gap-1"
            >
              <Download size={16} /> Export
            </button>
        </div>
        <div style={{ height: '400px' }}>
          <Line data={rfcsOverTimeChartData} options={rfcsOverTimeChartOptions as any} />
        </div>
      </div>

      {/* Data Tables for Export (Optional to display, but good for CSV) */}
      {/* Example:
      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 className="text-xl font-semibold text-secondary-dark mb-2">Raw Data (for export reference)</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
          {JSON.stringify({
            mocsByStatus: kpiData.mocsByStatus,
            mocsByDepartment: kpiData.mocsByDepartment,
            mocsOverTime: kpiData.mocsOverTime,
          }, null, 2)}
        </pre>
      </div>
      */}

    </div>
  );
}
