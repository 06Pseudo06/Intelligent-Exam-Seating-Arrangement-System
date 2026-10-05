import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Building2,
  CalendarDays,
  Sparkles,
  Plus,
  ArrowRight,
  Zap,
  Activity,
  FileText
} from "lucide-react";

import dashboardService from "../services/dashboardService";
import type { DashboardStats } from "../services/dashboardService";
import examService from "../services/examService";
import type { Exam } from "../types/Exam";

import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/common/StatCard";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, examsData] = await Promise.all([
          dashboardService.getStats(),
          examService.getExams()
        ]);
        setStats(statsData);
        setUpcomingExams(examsData.slice(0, 3)); // show top 3 upcoming exams
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

    return (
    <div className="font-['Manrope',sans-serif] space-y-10 text-[#2C2825]">

      <PageHeader
        badge="Overview"
        title="Dashboard"
        subtitle="Monitor examinations, classrooms, students and seating allocation from one unified workspace."
        actions={
          <Button onClick={() => navigate('/seating')}>
            <Plus size={18} />
            New Allocation
          </Button>
        }
      />

      {/* Hero Card */}
      <Card hero className="overflow-hidden relative" >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F8F4EF] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A7E76]">
              <Sparkles size={14} />
              Intelligent Seating Engine
            </div>
            <h2 className="font-cormorant text-[30px] leading-none text-[#2C2825]">
              Welcome Back
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#6D6660]">
              Generate intelligent seating layouts, manage examination
              infrastructure and monitor allocation progress from one
              centralized dashboard.
            </p>
          </div>
          <div className="flex items-center gap-10">
              <Button size="lg" onClick={() => navigate('/seating')}> 
                Generate Seating
                <ArrowRight size={18} />
              </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Students"
          value={loading ? "..." : (stats?.totalStudents || 0)}
          subtitle="Active student records"
          icon={GraduationCap}
          accent="sage"
        />
        <StatCard
          title="Classrooms"
          value={loading ? "..." : (stats?.totalClassrooms || 0)}
          subtitle="Configured halls"
          icon={Building2}
          accent="rose"
        />
        <StatCard
          title="Examinations"
          value={loading ? "..." : (stats?.totalExams || 0)}
          subtitle="Scheduled events"
          icon={CalendarDays}
          accent="sky"
        />
        <StatCard
          title="Seating Plans"
          value={loading ? "..." : (stats?.totalSeatingPlans || 0)}
          subtitle="Active seating grids"
          icon={FileText}
          accent="sage"
        />
        <StatCard
          title="Total Desks"
          value={loading ? "..." : (stats?.totalSeats || 0)}
          subtitle="Overall capacity size"
          icon={Building2}
          accent="rose"
        />
        <StatCard
          title="Occupancy"
          value={loading ? "..." : `${stats?.occupancyPercentage || 0}%`}
          subtitle="Candidates vs desks ratio"
          icon={Activity}
          accent="sky"
        />
      </div> 

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* Upcoming Exams */}
        <Card
          title="Upcoming Examinations"
          subtitle="Next scheduled assessments"
          className="xl:col-span-2 min-h-[420px]"
        >
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-[#7E7771] text-sm">Loading exam schedules...</div>
            ) : upcomingExams.length === 0 ? (
              <div className="py-20 text-center text-[#7E7771] text-sm border border-[#ECE4DD] bg-[#FCFBFA] rounded-2xl">
                No examinations scheduled yet.
              </div>
            ) : (
              upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-2xl border border-[#ECE4DD] bg-[#FCFBFA] p-5 transition hover:border-[#D8C8BB] hover:shadow-md"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#938A84] font-mono">
                      {exam.subjectCode}
                    </p>
                    <h4 className="mt-2 font-semibold text-lg text-[#2D2825]">
                      {exam.subjectName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#2D2825]">
                      {exam.examDate}
                    </p>
                    <p className="text-sm text-[#7E7771]">
                      {exam.startTime} - {exam.endTime}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card
          title="Quick Actions"
          subtitle="Frequently used shortcuts"
        >
          <div className="grid gap-4">
            <Button className="h-14 justify-between" onClick={() => navigate('/students')}>
              Manage Students
              <Plus size={16} />
            </Button>
            <Button
              h-14
              variant="secondary"
              className="justify-between"
              onClick={() => navigate('/classrooms')}
            >
              Configure Classrooms
              <Plus size={16} />
            </Button>
            <Button
              h-14
              variant="secondary"
              className="justify-between"
              onClick={() => navigate('/exams')}
            >
              Schedule Examinations
              <Plus size={16} />
            </Button>
            <Button h-14 variant="outline" className="justify-between" onClick={() => navigate('/seating')}>
              Seat Matrix Optimizer
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>

      </div>

      {/* Bottom Dashboard Info */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Latest Seating Plan Summary Statistics */}
        <Card
          title="Latest Allocator Summary"
          subtitle="Engine performance of the most recent plan"
        >
          {loading ? (
            <div className="py-10 text-center text-[#7E7771] text-sm">Loading execution metrics...</div>
          ) : !stats?.latestPlan ? (
            <div className="py-10 text-center text-[#7E7771] text-sm border border-dashed border-[#ECE4DD] bg-[#FCFBFA] rounded-2xl">
              No seating plans generated yet. Execute optimization to see statistics.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-[#FAF8F5] p-4 border border-[#ECE4DD]">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-[#64815E]" />
                  <span className="text-sm font-medium text-[#2C2825]">Allocated Candidates</span>
                </div>
                <span className="font-mono font-bold text-sm text-[#2C2825]">{stats.latestPlan.totalStudents} seated</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAF8F5] p-4 border border-[#ECE4DD]">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-[#A26739]" />
                  <span className="text-sm font-medium text-[#2C2825]">Engine Execution Speed</span>
                </div>
                <span className="font-mono font-bold text-sm text-[#2C2825]">{stats.latestPlan.executionTimeMs.toFixed(3)} ms</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAF8F5] p-4 border border-[#ECE4DD]">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-[#2F6E99]" />
                  <span className="text-sm font-medium text-[#2C2825]">Seat Proximity Conflicts</span>
                </div>
                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${stats.latestPlan.conflictCount > 0 ? 'bg-[#FBEBEB] text-[#C76F6F]' : 'bg-[#EEF4ED] text-[#64815E]'}`}>
                  {stats.latestPlan.conflictCount} conflicts
                </span>
              </div>

              <div className="text-[11px] text-[#8A7E76] text-right mt-2">
                Generated At: {new Date(stats.latestPlan.generatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </Card>

        {/* System Status */}
        <Card
          title="System Status"
          subtitle="Current platform health"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[#7A726B]">
                Allocation Engine (C++)
              </span>
              <span className="rounded-full bg-[#EEF4ED] px-3 py-1 text-xs font-semibold text-[#64815E]">
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#7A726B]">
                MySQL Database
              </span>
              <span className="rounded-full bg-[#EEF4ED] px-3 py-1 text-xs font-semibold text-[#64815E]">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#7A726B]">
                Active Classrooms
              </span>
              <span className="font-semibold text-sm">
                {loading ? "--" : (stats?.totalClassrooms || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#7A726B]">
                Scheduled Exams
              </span>
              <span className="font-semibold text-sm">
                {loading ? "--" : (stats?.totalExams || 0)}
              </span>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-[#7A726B]">
                  Capacity Utilization
                </span>
                <span className="font-bold text-sm text-[#2C2825]">
                  {loading ? "0" : (stats?.occupancyPercentage || 0)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#ECE4DD]">
                <div
                  className="h-full rounded-full bg-[#2F3E46] transition-all duration-500 ease-out"
                  style={{ width: `${loading ? 0 : (stats?.occupancyPercentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

      </div> 

    </div>
  );
};

export default Dashboard; 