"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crown,
  Plus,
  Edit3,
  Archive,
  Trash2,
  Mail,
  Calendar,
  User,
  Star,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProactiveGuest {
  id: string;
  eventId: string;
  guestEmail: string;
  guestName: string;
  guestTitle: string | null;
  personalMessage: string | null;
  status: string;
  qrCodeToken: string;
  createdAt: string;
  updatedAt: string;
  notificationSent: string | null;
  lastUsed: string | null;
}

interface Event {
  id: string;
  name: string;
  date: string | null;
}

export default function ProactiveGuestListDashboard() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [guests, setGuests] = useState<ProactiveGuest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || "");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ProactiveGuest | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    guestEmail: "",
    guestName: "",
    guestTitle: "",
    personalMessage: "",
  });

  const fetchEvents = useCallback(async () => {
    try {
      // This would typically come from an events API
      // For now, we'll fetch from the events endpoint
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        if (!selectedEventId && data.events?.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, [selectedEventId]);

  const fetchProactiveGuests = useCallback(async () => {
    if (!selectedEventId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/guest-list/proactive?eventId=${selectedEventId}`
      );
      if (response.ok) {
        const data = await response.json();
        setGuests(data.guestList || []);
      }
    } catch (error) {
      console.error("Failed to fetch proactive guests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchProactiveGuests();
    }
  }, [selectedEventId, fetchProactiveGuests]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;

    try {
      const url = editingGuest
        ? "/api/guest-list/proactive"
        : "/api/guest-list/proactive";

      const method = editingGuest ? "PUT" : "POST";
      const body = editingGuest
        ? {
            guestId: editingGuest.id,
            ...formData,
          }
        : {
            eventId: selectedEventId,
            ...formData,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingGuest(null);
        setFormData({
          guestEmail: "",
          guestName: "",
          guestTitle: "",
          personalMessage: "",
        });
        fetchProactiveGuests();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save guest");
      }
    } catch (error) {
      console.error("Failed to save guest:", error);
      alert("Failed to save guest");
    }
  }

  async function handleAction(guestId: string, action: "archive" | "delete") {
    if (!confirm(`Are you sure you want to ${action} this guest?`)) return;

    setProcessingIds((prev) => new Set(prev).add(guestId));

    try {
      const url = `/api/guest-list/proactive?guestId=${guestId}&archive=${
        action === "archive"
      }`;
      const response = await fetch(url, { method: "DELETE" });

      if (response.ok) {
        fetchProactiveGuests();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} guest`);
      }
    } catch (error) {
      console.error(`Failed to ${action} guest:`, error);
      alert(`Failed to ${action} guest`);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  }

  function openEditDialog(guest: ProactiveGuest) {
    setEditingGuest(guest);
    setFormData({
      guestEmail: guest.guestEmail,
      guestName: guest.guestName,
      guestTitle: guest.guestTitle || "",
      personalMessage: guest.personalMessage || "",
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingGuest(null);
    setFormData({
      guestEmail: "",
      guestName: "",
      guestTitle: "",
      personalMessage: "",
    });
    setIsDialogOpen(true);
  }

  const filteredGuests = guests.filter(
    (guest) =>
      guest.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.guestEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.guestTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGuests = filteredGuests.filter(
    (guest) => guest.status === "active"
  );
  const archivedGuests = filteredGuests.filter(
    (guest) => guest.status === "archived"
  );

  

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Crown className="w-8 h-8 text-purple-600" />
          Proactive VIP Guest List
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage VIP guests who get automatic access without requesting
        </p>
      </div>

      {/* Event Selection */}
      <div className="mb-6">
        <Label htmlFor="event-select">Select Event</Label>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Choose an event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {event.name}
                  {event.date && (
                    <span className="text-muted-foreground text-sm">
                      • {new Date(event.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEventId && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add VIP Guest
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingGuest ? "Edit VIP Guest" : "Add New VIP Guest"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="guestEmail">Email Address</Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        value={formData.guestEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            guestEmail: e.target.value,
                          }))
                        }
                        disabled={!!editingGuest}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestName">Full Name</Label>
                      <Input
                        id="guestName"
                        value={formData.guestName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            guestName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestTitle">VIP Title (Optional)</Label>
                      <Select
                        value={formData.guestTitle}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            guestTitle: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a VIP title" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No special title</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="Speaker">Speaker</SelectItem>
                          <SelectItem value="Sponsor">Sponsor</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Media">Media</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                          <SelectItem value="Judge">Judge</SelectItem>
                          <SelectItem value="Mentor">Mentor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="personalMessage">
                        Personal Message (Optional)
                      </Label>
                      <Textarea
                        id="personalMessage"
                        value={formData.personalMessage}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            personalMessage: e.target.value,
                          }))
                        }
                        placeholder="Add a personal welcome message..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        {editingGuest ? "Update Guest" : "Add Guest"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{activeGuests.length}</p>
                    <p className="text-sm text-muted-foreground">Active VIPs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {archivedGuests.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Archived</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {activeGuests.filter((g) => g.notificationSent).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Notified</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading VIP guests...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Active Guests */}
              {activeGuests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-6 h-6 text-green-500" />
                    Active VIP Guests ({activeGuests.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeGuests.map((guest) => (
                      <Card
                        key={guest.id}
                        className="border-green-200 bg-green-50/50"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-5 h-5" />
                              <CardTitle className="text-lg">
                                {guest.guestName}
                              </CardTitle>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(guest)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleAction(guest.id, "archive")
                                }
                                disabled={processingIds.has(guest.id)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAction(guest.id, "delete")}
                                disabled={processingIds.has(guest.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {guest.guestEmail}
                            </p>
                            {guest.guestTitle && (
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <Badge variant="secondary">
                                  {guest.guestTitle}
                                </Badge>
                              </div>
                            )}
                            {guest.personalMessage && (
                              <p className="text-sm bg-white p-2 rounded border">
                                {guest.personalMessage}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail
                                className={`w-3 h-3 ${
                                  guest.notificationSent
                                    ? "text-green-500"
                                    : "text-gray-400"
                                }`}
                              />
                              {guest.notificationSent
                                ? "Notified"
                                : "Not notified"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Added{" "}
                              {new Date(guest.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Guests */}
              {archivedGuests.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Archive className="w-6 h-6 text-yellow-500" />
                    Archived Guests ({archivedGuests.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedGuests.map((guest) => (
                      <Card
                        key={guest.id}
                        className="border-yellow-200 bg-yellow-50/50"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-5 h-5" />
                              <CardTitle className="text-lg">
                                {guest.guestName}
                              </CardTitle>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-yellow-700"
                            >
                              Archived
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {guest.guestEmail}
                            </p>
                            {guest.guestTitle && (
                              <Badge variant="secondary">
                                {guest.guestTitle}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Archived{" "}
                              {new Date(guest.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {filteredGuests.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      No VIP Guests Yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add VIP guests who will get automatic access to this
                      event.
                    </p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First VIP Guest
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
