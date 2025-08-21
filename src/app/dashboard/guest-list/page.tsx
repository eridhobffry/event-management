"use client";

import { useEffect, useState } from "react";

import {
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface GuestListRequest {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  requesterName: string;
  requesterEmail: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export default function GuestListDashboard() {
  const [requests, setRequests] = useState<GuestListRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGuestListRequests();
  }, []);

  async function fetchGuestListRequests() {
    try {
      const response = await fetch("/api/guest-list/organizer/requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch guest list requests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(
    requestId: string,
    action: "approve" | "reject"
  ) {
    setProcessingIds((prev) => new Set(prev).add(requestId));

    try {
      const response = await fetch("/api/guest-list/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          reviewNotes: reviewNotes[requestId] || undefined,
        }),
      });

      if (response.ok) {
        // Update the request in the list
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                  ...req,
                  status: action === "approve" ? "approved" : "rejected",
                  reviewedAt: new Date().toISOString(),
                  reviewNotes: reviewNotes[requestId] || null,
                }
              : req
          )
        );
        // Clear the review notes for this request
        setReviewNotes((prev) => {
          const newNotes = { ...prev };
          delete newNotes[requestId];
          return newNotes;
        });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to respond to request");
      }
    } catch (error) {
      console.error("Failed to respond to request:", error);
      alert("Failed to respond to request");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  }

  const pendingRequests = requests.filter((req) => req.status === "pending");
  const processedRequests = requests.filter((req) => req.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading guest list requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Crown className="w-8 h-8 text-purple-600" />
          Guest List Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and manage guest list requests for your events
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "rejected").length}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-yellow-500" />
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card
                key={request.id}
                className="border-yellow-200 bg-yellow-50/50"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {request.requesterName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {request.requesterEmail}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-yellow-500 text-yellow-700"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {request.eventName} •{" "}
                      {new Date(request.eventDate).toLocaleDateString()}
                    </div>

                    {request.reason && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Reason for request:
                        </h4>
                        <p className="text-sm bg-white p-3 rounded-lg border">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Review Notes (optional)
                      </label>
                      <Textarea
                        placeholder="Add notes about your decision..."
                        value={reviewNotes[request.id] || ""}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }))
                        }
                        className="mb-3"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleResponse(request.id, "approve")}
                        disabled={processingIds.has(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleResponse(request.id, "reject")}
                        disabled={processingIds.has(request.id)}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Recent Decisions ({processedRequests.length})
          </h2>
          <div className="space-y-4">
            {processedRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {request.requesterName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {request.requesterEmail}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        request.status === "approved"
                          ? "border-green-500 text-green-700"
                          : "border-red-500 text-red-700"
                      }
                    >
                      {request.status === "approved" ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {request.status === "approved" ? "Approved" : "Rejected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {request.eventName} •{" "}
                      {new Date(request.eventDate).toLocaleDateString()}
                    </div>
                    {request.reviewNotes && (
                      <div>
                        <h4 className="font-medium mb-1">Review Notes:</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.reviewNotes}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Reviewed on{" "}
                      {new Date(request.reviewedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              No Guest List Requests
            </h3>
            <p className="text-muted-foreground">
              When people request to be added to your event guest lists,
              they&apos;ll appear here for review.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
