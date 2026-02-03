"use client"

import { Plus } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface Session {
  id: string
  name: string
  date: string
  time: string
  description: string
}

interface CreateSessionFormProps {
  onCreate: (session: Session) => void
  onCancel: () => void
}

export function CreateSessionForm({ onCreate, onCancel }: CreateSessionFormProps) {
  const [name, setName] = React.useState("")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [description, setDescription] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newSession: Session = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      date,
      time,
      description,
    }
    onCreate(newSession)
    // Reset form
    setName("")
    setDate("")
    setTime("")
    setDescription("")
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Session</CardTitle>
        <CardDescription>
          Schedule a new attendance session for your students.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Session Name</Label>
            <Input
              id="name"
              placeholder="e.g. Physics 101 - Mechanics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="pl-3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="pl-3"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Topic relevant notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus className="mr-2 h-4 w-4" /> Create Session
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
