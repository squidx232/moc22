import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FileText, Clock, CheckCircle, AlertTriangle, Users, Calendar, TrendingUp } from 'lucide-react';

interface DashboardPageProps {
  currentUser?: any;
}

export default function DashboardPage({ currentUser }: DashboardPageProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  const allMocs = useQuery(
    api.moc.listRequests,
    currentUser?._id ? { 
      statusFilter: "all",
      requestingUserId: currentUser._id
    } : "skip"
  ) || [];

  const myMocs = allMocs.filter(moc => 
    moc.submitterId === currentUser?._id || 
    moc.assignedToId === currentUser?._id
  );

  const pendingMocs = allMocs.filter(moc => moc.status === 'pending_department_approval' || moc.status === 'pending_final_review');
  const approvedMocs = allMocs.filter(moc => moc.status === 'approved');
  const rejectedMocs = allMocs.filter(moc => moc.status === 'rejected');
  const draftMocs = allMocs.filter(moc => moc.status === 'draft');

  const recentMocs = allMocs
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5);

  const stats = [
    {
      title: 'Total RFCs',
      value: allMocs.length,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approval',
      value: pendingMocs.length,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Approved',
      value: approvedMocs.length,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'My RFCs',
      value: myMocs.length,
      icon: Users,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'implemented': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">
          {greeting}, {currentUser?.name || currentUser?.email || 'User'}! 👋
        </h1>
        <p className="text-blue-100">
          Welcome to the RFC Platform. Here's an overview of your change management activities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} p-6 rounded-lg shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RFCs */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} />
              Recent RFCs
            </h2>
          </div>
          <div className="space-y-3">
            {recentMocs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No RFCs found</p>
            ) : (
              recentMocs.map((moc) => (
                <div key={moc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{moc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(moc._creationTime).toLocaleDateString()}
                      {moc.departmentApprovals && moc.departmentApprovals.length > 0 && (
                        <span className="ml-2 text-xs">
                          • {moc.departmentApprovals.filter((d: any) => d.status === 'approved').length}/{moc.departmentApprovals.length} depts approved
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(moc.status)}`}>
                    {formatStatus(moc.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-medium text-blue-900">Pending Your Review</h3>
              <p className="text-sm text-blue-700 mt-1">
                {pendingMocs.length} RFCs waiting for approval
              </p>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h3 className="font-medium text-green-900">Recently Approved</h3>
              <p className="text-sm text-green-700 mt-1">
                {approvedMocs.length} RFCs have been approved
              </p>
            </div>

            {draftMocs.length > 0 && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900">Draft RFCs</h3>
                <p className="text-sm text-gray-700 mt-1">
                  {draftMocs.length} RFCs in draft status
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{allMocs.length}</div>
            <div className="text-sm text-gray-600">Total RFCs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((approvedMocs.length / Math.max(allMocs.length, 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingMocs.length}</div>
            <div className="text-sm text-gray-600">Awaiting Review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
