"use client";

import { ArrowRight, Calendar, Clock, Plus, Search, Users } from "lucide-react";
import * as React from "react";

import {
  CreateSessionForm,
  type Session,
} from "@/components/custom/create-session-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [sessions, setSessions] = React.useState<Session[]>([
    {
      id: "1",
      name: "Computer Architecture",
      date: "2023-11-20",
      time: "09:00",
      description: "Intro to RISC-V",
    },
    {
      id: "2",
      name: "Database Systems",
      date: "2023-11-20",
      time: "11:00",
      description: "Normalization forms",
    },
    {
      id: "3",
      name: "Algorithms II",
      date: "2023-11-21",
      time: "14:00",
      description: "Graph traversal techniques",
    },
  ]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleCreateSession = (newSession: Session) => {
    setSessions([newSession, ...sessions]);
    setShowCreateForm(false);
  };

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = [
    {
      title: "Total Sessions",
      value: sessions.length.toString(),
      description: "Recorded so far",
      icon: Calendar,
    },
    {
      title: "Active Students",
      value: "145",
      description: "Across all courses",
      icon: Users,
    },
    {
      title: "Avg. Attendance",
      value: "87%",
      description: "Last 30 days",
      icon: Clock, // Using Clock as a placeholder for a chart/trend icon
    },
  ];

  return (
    <div className="flex flex-col min-h-screen p-6 md:p-8 space-y-8 bg-muted/10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your attendance sessions and track student progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Session
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      {showCreateForm ? (
        <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CreateSessionForm
            onCreate={handleCreateSession}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Recent Sessions
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-background border-dashed h-64">
              <p className="text-muted-foreground mb-4">No sessions found.</p>
              <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                Create your first session
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className="group hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{session.name}</CardTitle>
                      {/* Status indicator stub */}
                      <div
                        className="h-2 w-2 rounded-full bg-green-500 mt-1.5"
                        title="Active"
                      />
                    </div>
                    <CardDescription>
                      {session.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 opacity-70" />
                        {session.date}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 opacity-70" />
                        {session.time}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-between group-hover:bg-background h-8"
                    >
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
