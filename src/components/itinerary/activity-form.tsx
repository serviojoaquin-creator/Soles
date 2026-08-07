import { CalendarDays, Clock3, MapPin } from "lucide-react";

import { authInputClass } from "@/components/ui/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActivityRow } from "@/features/itinerary/presentation";

const commonTimezones = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/London",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

type ActivityDefaults = Pick<
  ActivityRow,
  | "activity_date"
  | "description"
  | "end_time"
  | "location_name"
  | "start_time"
  | "timezone"
  | "title"
>;

export function ActivityForm({
  action,
  activityId,
  defaults,
  pendingLabel,
  submitLabel,
  tripEndDate,
  tripId,
  tripStartDate,
}: {
  action: (formData: FormData) => Promise<void>;
  activityId?: string;
  defaults: ActivityDefaults;
  pendingLabel: string;
  submitLabel: string;
  tripEndDate: string;
  tripId: string;
  tripStartDate: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="tripId" value={tripId} />
      {activityId ? (
        <input type="hidden" name="activityId" value={activityId} />
      ) : null}

      <label className="block text-sm font-medium">
        Actividad
        <input
          name="title"
          type="text"
          required
          minLength={1}
          maxLength={160}
          defaultValue={defaults.title}
          placeholder="Recorrer el casco histórico"
          className={authInputClass}
        />
      </label>

      <label className="block text-sm font-medium">
        Descripción <span className="text-muted font-normal">(opcional)</span>
        <textarea
          name="description"
          maxLength={4000}
          rows={3}
          defaultValue={defaults.description ?? ""}
          placeholder="Notas, reservas o ideas para el grupo."
          className={`${authInputClass} min-h-24 resize-y py-3`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="text-accent size-4" />
            Fecha
          </span>
          <input
            name="activityDate"
            type="date"
            required
            defaultValue={defaults.activity_date}
            className={authInputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          <span className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="text-accent size-4" />
            Desde <span className="text-muted font-normal">(opcional)</span>
          </span>
          <input
            name="startTime"
            type="time"
            defaultValue={defaults.start_time?.slice(0, 5) ?? ""}
            className={authInputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Hasta <span className="text-muted font-normal">(opcional)</span>
          <input
            name="endTime"
            type="time"
            defaultValue={defaults.end_time?.slice(0, 5) ?? ""}
            className={authInputClass}
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Zona horaria
        <input
          name="timezone"
          type="text"
          required
          maxLength={100}
          list="activity-timezones"
          defaultValue={defaults.timezone}
          className={authInputClass}
        />
        <datalist id="activity-timezones">
          {commonTimezones.map((timezone) => (
            <option key={timezone} value={timezone} />
          ))}
        </datalist>
        <span className="text-muted mt-2 block text-xs leading-5">
          El horario se guarda y se muestra en esta zona IANA; nunca toma la
          zona del servidor.
        </span>
      </label>

      <label className="block text-sm font-medium">
        <span className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="text-accent size-4" />
          Lugar <span className="text-muted font-normal">(opcional)</span>
        </span>
        <input
          name="locationName"
          type="text"
          maxLength={240}
          defaultValue={defaults.location_name ?? ""}
          placeholder="Museo, dirección o punto de encuentro"
          className={authInputClass}
        />
      </label>

      <label className="border-line bg-background flex gap-3 rounded-xl border p-3 text-sm leading-5">
        <input
          name="confirmOutsideRange"
          type="checkbox"
          value="yes"
          className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
        />
        <span>
          Confirmo la fecha aunque quede fuera del viaje ({tripStartDate} al{" "}
          {tripEndDate}). Solo hace falta marcarlo cuando sea una excepción.
        </span>
      </label>

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
