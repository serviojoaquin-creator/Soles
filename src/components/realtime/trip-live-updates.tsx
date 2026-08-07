"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  parseTripContentEvent,
  RealtimeRefreshCoordinator,
} from "@/features/realtime/events";
import { createClient } from "@/lib/supabase/client";

type ConnectionStatus = "connecting" | "connected" | "fallback";

export function TripLiveUpdates({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let disposed = false;
    const supabase = createClient();
    const coordinator = new RealtimeRefreshCoordinator(() => {
      if (disposed) return;
      startRefresh(() => router.refresh());
    });
    const channel = supabase
      .channel(`trip:${tripId}`, { config: { private: true } })
      .on("broadcast", { event: "trip_content_changed" }, ({ payload }) => {
        const event = parseTripContentEvent(payload);
        if (event) coordinator.receive(event);
      });

    async function subscribe() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (disposed) return;
      if (error || !session) {
        setStatus("fallback");
        return;
      }

      await supabase.realtime.setAuth(session.access_token);
      if (disposed) return;

      channel.subscribe((nextStatus, subscribeError) => {
        if (disposed) return;
        if (nextStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (
          nextStatus === "CHANNEL_ERROR" ||
          nextStatus === "TIMED_OUT" ||
          subscribeError
        ) {
          setStatus("fallback");
        }
      });
    }

    void subscribe();

    return () => {
      disposed = true;
      coordinator.dispose();
      void supabase.removeChannel(channel);
    };
  }, [router, startRefresh, tripId]);

  const label = isRefreshing
    ? "Actualizando cambios del grupo..."
    : status === "connected"
      ? "Cambios del grupo en vivo"
      : status === "fallback"
        ? "Actualización manual disponible"
        : "Conectando cambios del grupo...";

  return (
    <p
      role="status"
      aria-live="polite"
      className="border-line bg-surface text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${status === "connected" ? "bg-dusk" : "bg-sun"}`}
      />
      {label}
    </p>
  );
}
