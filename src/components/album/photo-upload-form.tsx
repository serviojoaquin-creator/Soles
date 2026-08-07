"use client";

import { ImagePlus, RotateCcw, UploadCloud } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type PhotoUploadFormProps = {
  activities: Array<{ id: string; title: string }>;
  maxFileBytes: number;
  tripId: string;
};

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function PhotoUploadForm({
  activities,
  maxFileBytes,
  tripId,
}: PhotoUploadFormProps) {
  const router = useRouter();
  const fieldId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const isUploading = state.kind === "uploading";

  function upload(form: HTMLFormElement) {
    const data = new FormData(form);
    const request = new XMLHttpRequest();
    requestRef.current = request;
    setState({ kind: "uploading", progress: 0 });
    request.open("POST", `/api/trips/${tripId}/photos`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setState({
        kind: "uploading",
        progress: Math.round((event.loaded / event.total) * 100),
      });
    };
    request.onerror = () => {
      setState({
        kind: "error",
        message: "Se cortó la conexión. Podés reintentar con la misma foto.",
      });
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        form.reset();
        setState({ kind: "success", message: "La foto se sumó al álbum." });
        router.refresh();
        return;
      }
      const message =
        typeof request.response?.error === "string"
          ? request.response.error
          : "No pudimos subir la foto. Intentá nuevamente.";
      setState({ kind: "error", message });
    };
    request.onloadend = () => {
      requestRef.current = null;
    };
    request.send(data);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isUploading) upload(event.currentTarget);
  }

  function cancelUpload() {
    requestRef.current?.abort();
    setState({
      kind: "error",
      message: "La subida se canceló. Podés reintentarlo cuando quieras.",
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="min-w-0 space-y-4">
      <div>
        <label htmlFor={`${fieldId}-photo`} className="text-sm font-semibold">
          Elegir foto
        </label>
        <input
          id={`${fieldId}-photo`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={isUploading}
          className="border-line bg-surface-strong mt-2 block w-full max-w-full min-w-0 rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-accent-soft)] file:px-3 file:py-2 file:font-semibold"
        />
        <p className="text-muted mt-2 text-xs leading-5">
          JPEG, PNG o WebP · máximo {Math.floor(maxFileBytes / 1_048_576)} MB.
          Verificamos el contenido y las dimensiones antes de guardarla.
        </p>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-activity`}
          className="text-sm font-semibold"
        >
          Actividad relacionada <span className="text-muted">(opcional)</span>
        </label>
        <select
          id={`${fieldId}-activity`}
          name="activityId"
          disabled={isUploading}
          className="border-line bg-surface-strong mt-2 w-full rounded-xl border px-3 py-2.5 text-sm"
        >
          <option value="">Ninguna actividad</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-description`}
          className="text-sm font-semibold"
        >
          Descripción <span className="text-muted">(opcional)</span>
        </label>
        <textarea
          id={`${fieldId}-description`}
          name="description"
          maxLength={2000}
          rows={3}
          disabled={isUploading}
          placeholder="Contá qué estaba pasando..."
          className="border-line bg-surface-strong mt-2 w-full resize-y rounded-xl border px-3 py-2.5 text-sm"
        />
      </div>

      {state.kind === "uploading" ? (
        <div role="status" className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Subiendo de forma privada...</span>
            <span>{state.progress}%</span>
          </div>
          <progress
            value={state.progress}
            max={100}
            className="h-2 w-full accent-[var(--color-brand)]"
          >
            {state.progress}%
          </progress>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div
          role="alert"
          className="border-brand/30 bg-accent-soft text-brand-strong rounded-xl border px-3 py-2 text-sm"
        >
          {state.message}
        </div>
      ) : null}
      {state.kind === "success" ? (
        <p role="status" className="bg-dusk/10 rounded-xl px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isUploading}
          className="from-brand to-accent hover:to-brand-strong inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <UploadCloud aria-hidden="true" className="size-4 animate-pulse" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-4" />
          )}
          {isUploading ? "Subiendo..." : "Subir foto"}
        </button>
        {isUploading ? (
          <button
            type="button"
            onClick={cancelUpload}
            className="border-line hover:bg-accent-soft rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          >
            Cancelar
          </button>
        ) : state.kind === "error" ? (
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="border-line hover:bg-accent-soft inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reintentar
          </button>
        ) : null}
      </div>
    </form>
  );
}
