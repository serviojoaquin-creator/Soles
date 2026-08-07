import { CalendarDays, ImagePlus, MapPin, PlaneTakeoff } from "lucide-react";

import { authInputClass } from "@/components/ui/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TripRow } from "@/features/trips/presentation";

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

type TripDefaults = Pick<
  TripRow,
  | "default_timezone"
  | "description"
  | "destination"
  | "end_date"
  | "name"
  | "start_date"
>;

export function TripForm({
  action,
  defaults,
  pendingLabel,
  showCover = false,
  submitLabel,
  tripId,
}: {
  action: (formData: FormData) => Promise<void>;
  defaults: TripDefaults;
  pendingLabel: string;
  showCover?: boolean;
  submitLabel: string;
  tripId?: string;
}) {
  return (
    <form action={action} className="space-y-7">
      {tripId ? <input type="hidden" name="tripId" value={tripId} /> : null}

      <fieldset className="space-y-5">
        <legend className="flex items-center gap-3 text-lg font-semibold">
          <span className="bg-accent-soft text-brand grid size-10 place-items-center rounded-xl">
            <PlaneTakeoff aria-hidden="true" className="size-5" />
          </span>
          Lo esencial
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">
            Nombre del viaje
            <input
              name="name"
              type="text"
              required
              minLength={1}
              maxLength={120}
              defaultValue={defaults.name}
              placeholder="Escapada a la Patagonia"
              className={authInputClass}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Descripción{" "}
            <span className="text-muted font-normal">(opcional)</span>
            <textarea
              name="description"
              maxLength={4000}
              rows={4}
              defaultValue={defaults.description ?? ""}
              placeholder="Ideas, expectativas y todo lo que quieran recordar."
              className={`${authInputClass} min-h-28 resize-y py-3`}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="text-accent size-4" />
              Destino
            </span>
            <input
              name="destination"
              type="text"
              required
              minLength={1}
              maxLength={160}
              defaultValue={defaults.destination}
              placeholder="Bariloche, Argentina"
              className={authInputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="border-line space-y-5 border-t pt-7">
        <legend className="flex items-center gap-3 pr-4 text-lg font-semibold">
          <span className="bg-accent-soft text-brand grid size-10 place-items-center rounded-xl">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          Fechas y zona horaria
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Salida
            <input
              name="startDate"
              type="date"
              required
              defaultValue={defaults.start_date}
              className={authInputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Regreso
            <input
              name="endDate"
              type="date"
              required
              defaultValue={defaults.end_date}
              className={authInputClass}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Zona horaria del viaje
            <input
              name="defaultTimezone"
              type="text"
              required
              maxLength={100}
              list="trip-timezones"
              defaultValue={defaults.default_timezone}
              placeholder="America/Argentina/Buenos_Aires"
              className={authInputClass}
            />
            <datalist id="trip-timezones">
              {commonTimezones.map((timezone) => (
                <option key={timezone} value={timezone} />
              ))}
            </datalist>
            <span className="text-muted mt-2 block text-xs leading-5">
              Usamos nombres IANA para que las fechas no cambien según el
              servidor.
            </span>
          </label>
        </div>
      </fieldset>

      {showCover ? (
        <fieldset className="border-line space-y-4 border-t pt-7">
          <legend className="flex items-center gap-3 pr-4 text-lg font-semibold">
            <span className="bg-accent-soft text-brand grid size-10 place-items-center rounded-xl">
              <ImagePlus aria-hidden="true" className="size-5" />
            </span>
            Portada opcional
          </legend>
          <label className="block text-sm font-medium" htmlFor="cover">
            Imagen del viaje
          </label>
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="border-line file:bg-accent-soft file:text-brand w-full rounded-xl border bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:font-semibold"
          />
          <p className="text-muted text-xs leading-5">
            JPEG, PNG o WebP. Máximo 2 MB. Se guarda en un espacio privado y
            solo los miembros del viaje pueden verla.
          </p>
        </fieldset>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
