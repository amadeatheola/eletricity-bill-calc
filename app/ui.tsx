"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Zap as Bolt,
  House,
  Users,
  CalendarDays,
  Plus,
  Check,
  CheckCheck,
  Upload,
  X,
  LogOut,
  HelpCircle,
  Copy,
  MessageCircle,
  ShieldCheck,
  Leaf,
  FileText,
  Settings,
  LockKeyhole,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  billingPeriod,
  periodDays,
  splitBill,
  type Split,
} from "@/lib/billing";
import type { AppData, Calculation, Household, Participant } from "@/lib/types";
const money = (cents: number, currency = "MYR") =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
const dayLabel = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const monthLabel = (month: string) =>
  new Date(month + "-01T00:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
};
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
const whatsapp = (phone: string, message: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
const hrefFor = (household: string, calculation?: string) =>
  `${window.location.origin}/?household=${household}${calculation ? `&calculation=${calculation}` : ""}`;
type Mutation = (
  input: Record<string, unknown>,
  message: string,
) => Promise<Record<string, string> | null>;
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ProfileForm({ mutate, busy }: { mutate: Mutation; busy: boolean }) {
  return (
    <div className="form-stack">
      {" "}
      <p>
        Add your name and phone number before creating or joining a household.
        Your housemates will use these details to recognize you and share
        WhatsApp reminders.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await mutate(
            {
              action: "profile",
              name: f.get("name"),
              phone: f.get("phone"),
            },
            "Profile registered. Create or join your household.",
          );
        }}
      >
        <Field label="Your name">
          <input name="name" required maxLength={80} autoComplete="name" />
        </Field>
        <Field
          label="Phone number"
          hint="Include the country code. Use the number your leader invited."
        >
          <input
            name="phone"
            type="tel"
            required
            placeholder="+60123456789"
            autoComplete="tel"
          />
        </Field>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
function HouseholdSetup({
  signedIn,
  onCreate,
  onJoin,
  hasHousehold = false,
}: {
  signedIn: boolean;
  hasHousehold?: boolean;
  onCreate: () => void;
  onJoin: () => void;
}) {
  function signInPath(action: "create" | "join") {
    const params = new URLSearchParams(window.location.search);
    params.delete("calculation");
    params.set("view", "household");
    params.set("action", action);
    return `/signin-with-chatgpt?return_to=${encodeURIComponent(`/?${params}`)}`;
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LET’S GET YOU SETTLED</span>
          <h1>
            {hasHousehold ? "Your households" : "Your household starts here."}
          </h1>
          <p>
            Create a home for your housemates, or join one that’s already
            waiting for you.
          </p>
        </div>
      </div>
      {!signedIn && (
        <p className="household-signin-note">
          Sign in and complete your profile to create or join a household. We’ll
          bring you back to the option you choose.
        </p>
      )}
      <div className="choice-grid">
        <div className="card choice">
          <House size={32} />
          <h2>Create a household</h2>
          <p>
            Set the billing cycle, add your housemates, and keep everyone’s
            monthly bills in one place.
          </p>
          {signedIn ? (
            <button className="button primary" onClick={onCreate}>
              <Plus size={17} /> Create household
            </button>
          ) : (
            <a
              className="button primary"
              href={signInPath("create")}
              target="_top"
            >
              <Plus size={17} /> Create household
            </a>
          )}
        </div>
        <div className="card choice">
          <Users size={32} />
          <h2>Join a household</h2>
          <p>
            Have an invitation? You’ll need the household ID, password, and the
            phone number your leader invited.
          </p>
          {signedIn ? (
            <button className="button secondary" onClick={onJoin}>
              Join household
            </button>
          ) : (
            <a
              className="button secondary"
              href={signInPath("join")}
              target="_top"
            >
              Join household
            </a>
          )}
        </div>
      </div>
      {!hasHousehold && (
        <div className="section-space">
          <HowItWorks />
        </div>
      )}
    </>
  );
}
function HowItWorks() {
  return (
    <div className="how-grid">
      <div className="card">
        <CalendarDays className="feature-icon" />
        <h3>Your days make the difference</h3>
        <p>
          Each day gets an equal part of the electricity bill. The people home
          that day share that cost equally.
        </p>
        <div className="formula">Bill ÷ days in period ÷ people home</div>
        <p className="small">
          This is a fair sharing estimate, not a measurement of individual
          electricity use.
        </p>
      </div>
      <div className="card">
        <House className="feature-icon" />
        <h3>A few house rules</h3>
        <ul className="rules">
          <li>The first date counts; the end date starts the next period.</li>
          <li>Away for the entire period? Your share is zero.</li>
          <li>
            Empty-house days are shared equally among everyone who stayed at
            least once.
          </li>
          <li>
            Cents are rounded fairly, and shares always add up to the bill.
          </li>
        </ul>
      </div>
      <div className="card">
        <ShieldCheck className="feature-icon" />
        <h3>Clear from start to settled</h3>
        <p>
          Everyone submits their own attendance. The leader checks the split and
          locks it before payments begin.
        </p>
        <p>
          Upload a receipt for your leader to review. Only you and your leader
          can open the file.
        </p>
      </div>
    </div>
  );
}
function Example() {
  const days = periodDays("2026-11-01", "2026-11-08");
  const [selected, setSelected] = useState(days.slice(0, 4));
  const split = splitBill(21000, days[0], "2026-11-08", [
    { id: "you", days: selected },
    { id: "alex", days },
    { id: "sam", days: days.slice(0, 5) },
  ]);
  return (
    <div className="example card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TRY THE SPLIT</span>
          <h2>Same home. Different schedules.</h2>
        </div>
        <Badge>Example</Badge>
      </div>
      <p>
        A {money(21000)} bill over 7 days. Alex stays all week; Sam stays 5
        days. Tap the days you’re home.
      </p>
      <div className="demo-days">
        {days.map((d) => (
          <button
            key={d}
            aria-pressed={selected.includes(d)}
            onClick={() =>
              setSelected((s) =>
                s.includes(d) ? s.filter((x) => x !== d) : [...s, d],
              )
            }
            className={selected.includes(d) ? "selected" : ""}
          >
            <span>
              {new Date(d).toLocaleDateString("en", {
                weekday: "short",
                timeZone: "UTC",
              })}
            </span>
            <strong>{+d.slice(8)}</strong>
            {selected.includes(d) ? (
              <Check size={14} />
            ) : (
              <span className="empty-check" />
            )}
          </button>
        ))}
      </div>
      <div className="sample-shares">
        {split.shares.map((s, i) => (
          <div key={s.id}>
            <span className={`avatar avatar-${i}`}>{["Y", "A", "S"][i]}</span>
            <div>
              <strong>{["Your share", "Alex", "Sam"][i]}</strong>
              <small>{s.days} days at home</small>
            </div>
            <b>{money(s.cents)}</b>
          </div>
        ))}
      </div>
      <div className="note">
        <Leaf size={16} />
        <span>
          Less time at home, a smaller share. Every day is accounted for.
        </span>
      </div>
    </div>
  );
}
function HouseForm({
  house,
  mutate,
  busy,
  close,
}: {
  house?: Household;
  mutate: Mutation;
  busy: boolean;
  close: () => void;
}) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = String(f.get("password") || "");
    const result = await mutate(
      {
        action: house ? "settings" : "createHousehold",
        householdId: house?.id,
        name: f.get("name"),
        expectedMembers: Number(f.get("count")),
        cycleDay: Number(f.get("day")),
        currency: f.get("currency"),
        paymentInstructions: f.get("payment"),
        ...(p ? { password: p } : {}),
      },
      house
        ? "Household updated."
        : "Your household is ready. Add your housemates next.",
    );
    if (result) close();
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <p className="muted">
        {house
          ? "These defaults apply to future calculations. Existing bills keep their dates and currency."
          : "You’ll be the household leader. Invite your housemates after creating your home."}
      </p>
      <Field label="Household name">
        <input
          required
          name="name"
          maxLength={80}
          defaultValue={house?.name}
          placeholder="e.g. The Maple House"
        />
      </Field>
      <div className="form-row">
        <Field label="Number of people" hint="Including you">
          <input
            required
            name="count"
            type="number"
            min={1}
            max={50}
            defaultValue={house?.expected_members || 4}
          />
        </Field>
        <Field label="Currency">
          <select name="currency" defaultValue={house?.currency || "MYR"}>
            {["MYR", "SGD", "USD", "GBP", "EUR", "AUD", "IDR"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Billing cycle day"
        hint="22 means the 22nd of last month up to, but not including, the 22nd of this month. Short months use their last day."
      >
        <input
          required
          name="day"
          type="number"
          min={1}
          max={31}
          defaultValue={house?.cycle_day || 22}
        />
      </Field>
      <Field
        label={
          house ? "New household password (optional)" : "Household password"
        }
        hint="At least 10 characters. Share privately with your housemates."
      >
        <input
          name="password"
          type="password"
          minLength={10}
          maxLength={128}
          required={!house}
          autoComplete="new-password"
        />
      </Field>
      <Field
        label="Payment instructions (optional)"
        hint="Tell members how to pay you, such as a bank transfer reference."
      >
        <textarea
          name="payment"
          maxLength={1000}
          defaultValue={house?.payment_instructions}
          placeholder="Transfer to… Use your name as the reference."
          rows={3}
        />
      </Field>
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : house ? "Save settings" : "Create household"}
      </button>
    </form>
  );
}
function NewBill({
  house,
  mutate,
  busy,
  close,
}: {
  house: Household;
  mutate: Mutation;
  busy: boolean;
  close: () => void;
}) {
  const [month, setMonth] = useState(currentMonth());
  const initial = billingPeriod(month, house.cycle_day);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  function changeMonth(value: string) {
    setMonth(value);
    if (/^\d{4}-\d{2}$/.test(value)) {
      const next = billingPeriod(value, house.cycle_day);
      setStart(next.start);
      setEnd(next.end);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = String(f.get("amount"));
    const totalCents = Math.round(Number(amount) * 100);
    const result = await mutate(
      {
        action: "createCalculation",
        householdId: house.id,
        month,
        start,
        end,
        totalCents,
      },
      "Calculation created. Everyone can now submit their days.",
    );
    if (result) close();
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <p className="muted">
        One calculation per month. All current household members will be
        included and asked to confirm their attendance.
      </p>
      <Field label="Bill month">
        <input
          type="month"
          required
          value={month}
          onChange={(e) => changeMonth(e.target.value)}
        />
      </Field>
      <Field label={`Total electricity bill (${house.currency})`}>
        <input
          name="amount"
          required
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          placeholder="0.00"
        />
      </Field>
      <div className="form-row">
        <Field label="From (included)">
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="To (excluded)">
          <input
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <div className="note">
        <HelpCircle size={18} />
        <span>
          You can adjust these dates for this bill. Empty-house days are shared
          among members who stayed at least once.
        </span>
      </div>
      <button className="button primary" disabled={busy}>
        {busy ? "Creating…" : "Create calculation"}
      </button>
    </form>
  );
}
function AttendanceCalendar({
  calc,
  person,
  mutate,
  busy,
}: {
  calc: Calculation;
  person: Participant;
  mutate: Mutation;
  busy: boolean;
}) {
  const days = periodDays(calc.start, calc.end);
  const [mode, setMode] = useState(person.attendance || "some");
  const [chosen, setChosen] = useState(person.days);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) {
      setMode(person.attendance || "some");
      setChosen(person.days);
    }
  }, [person.attendance, person.days, dirty]);
  const selection = mode === "all" ? days : mode === "none" ? [] : chosen;
  const months = [...new Set(days.map((d) => d.slice(0, 7)))];
  async function submit() {
    const result = await mutate(
      {
        action: "attendance",
        calculationId: calc.id,
        attendance: mode,
        days: selection,
        version: person.version,
      },
      "Your attendance has been saved.",
    );
    if (result) setDirty(false);
  }
  return (
    <div className="card attendance">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR ATTENDANCE</span>
          <h2>When were you home?</h2>
        </div>
        {person.attendance && (
          <Badge tone="green">
            <Check size={13} /> Submitted
          </Badge>
        )}
      </div>
      <p>
        {mode === "none"
          ? "You’re away for this entire period. Choose Selected days to mark days at home."
          : "Mark the days you stayed during this billing period."}
      </p>
      <div className="segmented">
        {[
          ["all", "Entire period"],
          ["some", "Selected days"],
          ["none", "Away throughout"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={mode === key}
            className={mode === key ? "active" : ""}
            onClick={() => {
              setMode(key);
              setDirty(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="calendars">
        {months.map((month) => {
          const dates = days.filter((d) => d.startsWith(month));
          const offset = (new Date(dates[0]).getUTCDay() + 6) % 7;
          return (
            <div key={month} className="calendar">
              <h3>{monthLabel(month)}</h3>
              <div className="calendar-grid">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span className="weekday" key={i}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={`pad${i}`} />
                ))}
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={mode === "none"}
                    aria-label={`${dayLabel(d)}, ${selection.includes(d) ? "at home" : "none"}`}
                    aria-pressed={selection.includes(d)}
                    className={selection.includes(d) ? "selected" : ""}
                    onClick={() => {
                      setChosen(
                        selection.includes(d)
                          ? selection.filter((x) => x !== d)
                          : [...selection, d],
                      );
                      setMode("some");
                      setDirty(true);
                    }}
                  >
                    {+d.slice(8)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="attendance-footer">
        <span>
          <b>{selection.length}</b> of {days.length} days at home
        </span>
        <button className="button primary" disabled={busy} onClick={submit}>
          {busy
            ? "Saving…"
            : person.attendance
              ? "Update attendance"
              : "Save my attendance"}
        </button>
      </div>
    </div>
  );
}
function ReceiptPanel({
  calc,
  person,
  house,
  leaderPhone,
  mutate,
  refresh,
  busy,
  onError,
}: {
  calc: Calculation;
  person: Participant;
  house: Household;
  leaderPhone: string;
  mutate: Mutation;
  refresh: () => Promise<void>;
  busy: boolean;
  onError: (s: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const share = calc.result?.shares.find((s) => s.id === person.id)?.cents || 0;
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const f = new FormData();
      f.set("participantId", person.id);
      f.set("file", file);
      const response = await fetch("/api/receipt", { method: "POST", body: f });
      const result = (await response.json()) as Record<string, string>;
      if (!response.ok) throw new Error(result.error);
      await refresh();
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  void mutate;
  return (
    <div className="card payment-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR PAYMENT</span>
          <h2>{share ? money(share, calc.currency) : "Nothing to pay"}</h2>
        </div>
        <Badge
          tone={person.receipt_status === "approved" ? "green" : "neutral"}
        >
          {person.receipt_status === "approved"
            ? "Payment confirmed"
            : person.receipt_status === "pending"
              ? "Awaiting review"
              : share
                ? "Payment due"
                : "No share due"}
        </Badge>
      </div>
      {!!share && (
        <>
          <p>
            {house.payment_instructions ||
              "Check with your household leader for payment details, then upload your receipt here."}
          </p>
          {person.receipt_status === "rejected" && (
            <div className="error">
              <b>Your leader requested a new receipt.</b>
              <br />
              {person.receipt_note}
            </div>
          )}
          {person.hasReceipt && (
            <a
              className="text-link"
              href={`/api/receipts/${person.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={16} /> Download your receipt
            </a>
          )}
          {person.receipt_status !== "approved" && (
            <form onSubmit={upload} className="upload-form">
              <label className="upload-box">
                <Upload size={24} />
                <strong>
                  {person.hasReceipt
                    ? "Replace your receipt"
                    : "Upload payment receipt"}
                </strong>
                <span>PNG, JPEG, or PDF · up to 5 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  required
                  aria-label="Payment receipt"
                />
              </label>
              <button className="button primary" disabled={uploading || busy}>
                {uploading ? "Uploading…" : "Submit receipt for review"}
              </button>
            </form>
          )}
          {person.hasReceipt && (
            <a
              className="button whatsapp"
              href={whatsapp(
                leaderPhone,
                `Hi! I uploaded my receipt for ${house.name}, ${monthLabel(calc.month)} (${money(share, calc.currency)}). Please review it here: ${hrefFor(house.id, calc.id)}`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> Notify leader on WhatsApp
            </a>
          )}
          <p className="small">
            WhatsApp opens a message for you to send. Your receipt stays in the
            app, where your leader can review it.
          </p>
        </>
      )}
    </div>
  );
}
function BillDetail({
  calc,
  data,
  mutate,
  busy,
  refresh,
  onError,
  onBack,
}: {
  calc: Calculation;
  data: AppData;
  mutate: Mutation;
  busy: boolean;
  refresh: () => Promise<void>;
  onError: (s: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [review, setReview] = useState<Participant | null>(null);
  const [finalize, setFinalize] = useState(false);
  const house = data.household!;
  const leader = house.leader_id === data.user?.userId;
  const me = calc.participants.find((p) => p.user_id === data.user?.userId);
  const submitted = calc.participants.filter((p) => p.attendance).length;
  let split: Split | null = calc.result;
  let splitError = "";
  if (!split && submitted === calc.participants.length) {
    try {
      split = splitBill(
        calc.total_cents,
        calc.start,
        calc.end,
        calc.participants.map((p) => ({ id: p.id, days: p.days })),
      );
    } catch (e) {
      splitError = (e as Error).message;
    }
  }
  const myShare = split?.shares.find((p) => p.id === me?.id)?.cents;
  const totalDays = periodDays(calc.start, calc.end).length;
  const approved = calc.participants.filter(
    (p) => p.receipt_status === "approved",
  ).length;
  return (
    <>
      <button className="text-link back" onClick={onBack}>
        All calculations
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MONTHLY CALCULATION</div>
          <h1>{monthLabel(calc.month)}</h1>
          <p>
            {dayLabel(calc.start)} – {dayLabel(calc.end)}{" "}
            <span className="muted">
              · End date excluded · {totalDays} days
            </span>
          </p>
        </div>
        <Badge tone={calc.status === "finalized" ? "green" : "amber"}>
          {calc.status === "finalized" ? (
            <LockKeyhole size={14} />
          ) : (
            <CalendarDays size={14} />
          )}{" "}
          {calc.status === "finalized"
            ? "Split finalized"
            : "Collecting attendance"}
        </Badge>
      </div>
      <div className="metrics">
        <div className="metric">
          <span>Total electricity bill</span>
          <strong>{money(calc.total_cents, calc.currency)}</strong>
          <small>
            {money(calc.total_cents / totalDays, calc.currency)} per day before
            splitting
          </small>
        </div>
        <div className="metric">
          <span>Attendance received</span>
          <strong>
            {submitted}
            <em> / {calc.participants.length}</em>
          </strong>
          <small>
            {submitted === calc.participants.length
              ? "Everyone has responded"
              : "Waiting for everyone’s dates"}
          </small>
        </div>
        <div className="metric">
          <span>
            {calc.status === "finalized"
              ? "Your amount"
              : "Your estimated share"}
          </span>
          <strong>
            {myShare === undefined ? "—" : money(myShare, calc.currency)}
          </strong>
          <small>
            {myShare === undefined
              ? "Available once everyone responds"
              : calc.status === "finalized"
                ? `${approved} receipt${approved === 1 ? "" : "s"} approved`
                : "Confirmed when the leader finalizes"}
          </small>
        </div>
      </div>
      <div className="tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview & split
        </button>
        <button
          className={tab === "days" ? "active" : ""}
          onClick={() => setTab("days")}
        >
          Daily breakdown
        </button>
        <button
          className="copy-link"
          onClick={() =>
            navigator.clipboard
              .writeText(hrefFor(house.id, calc.id))
              .then(() => onError("Calculation link copied."))
              .catch(() =>
                onError(
                  "Could not copy the link. Copy it from your address bar.",
                ),
              )
          }
        >
          <Copy size={15} /> Copy link
        </button>
      </div>
      {tab === "overview" ? (
        <div className="detail-grid">
          <div>
            <div className="card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">EVERYONE’S SHARE</span>
                  <h2>A little transparency goes a long way.</h2>
                </div>
              </div>
              <div className="member-list">
                {calc.participants.map((p, i) => {
                  const share = split?.shares.find((s) => s.id === p.id);
                  return (
                    <div key={p.id} className="member-row">
                      <span className={`avatar avatar-${i % 4}`}>
                        {initials(p.name)}
                      </span>
                      <div className="member-info">
                        <strong>
                          {p.name}
                          {p.id === me?.id && (
                            <span className="muted"> (you)</span>
                          )}
                        </strong>
                        <small>
                          {p.attendance
                            ? p.days.length
                              ? `${p.days.length} days at home`
                              : "Away throughout"
                            : "Attendance not submitted"}
                        </small>
                        {calc.status === "finalized" && !!share?.cents && (
                          <Badge
                            tone={
                              p.receipt_status === "approved"
                                ? "green"
                                : p.receipt_status === "pending"
                                  ? "amber"
                                  : "neutral"
                            }
                          >
                            {p.receipt_status === "approved"
                              ? "Paid"
                              : p.receipt_status === "pending"
                                ? "Receipt in review"
                                : p.receipt_status === "rejected"
                                  ? "New receipt requested"
                                  : "Payment due"}
                          </Badge>
                        )}
                      </div>
                      <div className="member-amount">
                        <strong>
                          {share ? money(share.cents, calc.currency) : "—"}
                        </strong>
                        {leader &&
                          calc.status === "collecting" &&
                          !p.attendance && (
                            <a
                              className="text-link"
                              href={whatsapp(
                                p.phone,
                                `Hi ${p.name}, please confirm your days at home for ${house.name}, ${monthLabel(calc.month)}: ${hrefFor(house.id, calc.id)} . If you haven't joined yet, register with your invited phone number and ask me privately for the household password.`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle size={14} /> Invite / remind
                            </a>
                          )}
                        {leader && p.hasReceipt && (
                          <button
                            className="text-link"
                            onClick={() => setReview(p)}
                          >
                            Review receipt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {split && (
                <div className="split-total">
                  <span>Total allocated</span>
                  <b>
                    {money(
                      split.shares.reduce((sum, s) => sum + s.cents, 0),
                      calc.currency,
                    )}
                  </b>
                </div>
              )}
              {splitError && <div className="error">{splitError}</div>}
              {!split && !splitError && (
                <div className="note">
                  <CalendarDays size={18} />
                  <span>
                    The split appears after everyone submits attendance. Pending
                    responses are never treated as absences.
                  </span>
                </div>
              )}
              {split && split.vacantDays > 0 && (
                <p className="small">
                  {split.vacantDays} empty-house day
                  {split.vacantDays === 1 ? "" : "s"} shared equally among
                  members who stayed at least once.
                </p>
              )}
              {leader && calc.status === "collecting" && (
                <button
                  className="button primary wide"
                  disabled={busy || !split}
                  onClick={() => setFinalize(true)}
                >
                  <LockKeyhole size={16} /> Finalize this split
                </button>
              )}
            </div>
            <div className="note calculation-id">
              <ShieldCheck size={16} />
              <span>
                Visible to household members only.
                <br />
                <span className="small">Calculation ID: {calc.id}</span>
              </span>
            </div>
          </div>
          <div>
            {me && calc.status === "collecting" && (
              <AttendanceCalendar
                key={calc.id + me.id}
                calc={calc}
                person={me}
                mutate={mutate}
                busy={busy}
              />
            )}
            {me && calc.status === "finalized" && (
              <ReceiptPanel
                calc={calc}
                person={me}
                house={house}
                leaderPhone={
                  data.members.find((m) => m.user_id === house.leader_id)
                    ?.phone || ""
                }
                mutate={mutate}
                refresh={refresh}
                busy={busy}
                onError={onError}
              />
            )}
            <div className="mini-explainer">
              <Leaf size={21} />
              <div>
                <strong>Every day has its own split.</strong>
                <p>
                  A day shared by three costs each person less than a day spent
                  home alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="section-heading">
            <div>
              <h2>One day at a time</h2>
              <p>
                Each day’s cost is divided by the number of people who stayed.
              </p>
            </div>
          </div>
          {split ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>People home</th>
                    <th>Daily bill</th>
                    <th>Cost per person</th>
                  </tr>
                </thead>
                <tbody>
                  {split.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel(d.date)}</td>
                      <td>{d.occupants || "Empty house"}</td>
                      <td>
                        {money(calc.total_cents / totalDays, calc.currency)}
                      </td>
                      <td>
                        {d.occupants
                          ? money(
                              calc.total_cents / totalDays / d.occupants,
                              calc.currency,
                            )
                          : "Shared among participating members"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small">
                Daily figures are displayed rounded. Final shares use exact
                fractions before allocating cents.
              </p>
            </div>
          ) : (
            <div className="empty">
              <CalendarDays />
              <h3>Waiting for everyone’s calendar</h3>
              <p>The daily breakdown will appear once all members respond.</p>
            </div>
          )}
        </div>
      )}
      {review && (
        <Modal title={`Receipt · ${review.name}`} close={() => setReview(null)}>
          <p>
            <Badge>{review.receipt_status}</Badge>
          </p>
          <a
            className="button secondary"
            href={`/api/receipts/${review.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={16} /> Download receipt
          </a>
          {review.receipt_status === "pending" ? (
            <form
              className="form-stack review-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const status =
                  (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                    "value",
                  ) || "approved";
                const result = await mutate(
                  {
                    action: "review",
                    participantId: review.id,
                    version: review.version,
                    status,
                    note: f.get("note"),
                  },
                  status === "approved"
                    ? "Payment confirmed."
                    : "Member asked to upload a new receipt.",
                );
                if (result) setReview(null);
              }}
            >
              <Field
                label="Review note"
                hint="Required when asking for a new receipt."
              >
                <textarea name="note" maxLength={500} rows={3} />
              </Field>
              <div className="form-row">
                <button
                  value="rejected"
                  disabled={busy}
                  className="button secondary"
                >
                  Request new receipt
                </button>
                <button
                  value="approved"
                  disabled={busy}
                  className="button primary"
                >
                  <CheckCheck size={16} /> Confirm payment
                </button>
              </div>
            </form>
          ) : (
            <p>
              {review.receipt_note || "This receipt has already been reviewed."}
            </p>
          )}
        </Modal>
      )}
      {finalize && (
        <Modal title="Ready to finalize?" close={() => setFinalize(false)}>
          <p>
            All {calc.participants.length} members have submitted attendance.
            Finalizing locks their calendars and confirms the amounts shown
            here.
          </p>
          <p>
            Members can then pay and upload receipts. Check the dates and shares
            before continuing.
          </p>
          <button
            disabled={busy}
            className="button primary wide"
            onClick={async () => {
              const result = await mutate(
                {
                  action: "finalize",
                  calculationId: calc.id,
                  version: calc.version,
                },
                "Split finalized. Members can now upload payment receipts.",
              );
              if (result) setFinalize(false);
            }}
          >
            {busy ? "Finalizing…" : "Confirm and lock split"}
          </button>
        </Modal>
      )}
    </>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState("bills");
  const [modal, setModal] = useState("");
  const [calcId, setCalcId] = useState("");
  const [joinHouseholdId, setJoinHouseholdId] = useState("");
  const refresh = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const response = await fetch(`/api?${params}`);
    const result = (await response.json()) as Record<string, string>;
    if (!response.ok) throw new Error(result.error);
    setData(result as unknown as AppData);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCalcId(params.get("calculation") || "");
    const view = params.get("view");
    if (view === "home" || view === "bills" || view === "household" || view === "how")
      setSection(view);
    else if (params.has("household") && !params.has("calculation"))
      setSection("household");
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const beginHouseholdAction = useCallback(
    (action: "create" | "join") => {
      if (!data?.user) return;
      const params = new URLSearchParams(window.location.search);
      params.set("view", "household");
      params.delete("calculation");
      setSection("household");
      setCalcId("");
      setError("");
      if (!data.profile) {
        params.set("action", action);
        setModal("profile");
      } else {
        const invitedId = params.get("household") || "";
        setJoinHouseholdId(
          data.households.some((h) => h.id === invitedId) ? "" : invitedId,
        );
        params.delete("action");
        setModal(action === "create" ? "createHousehold" : "join");
      }
      window.history.replaceState(null, "", `/?${params}`);
    },
    [data],
  );
  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "create" || action === "join") beginHouseholdAction(action);
  }, [beginHouseholdAction]);
  function closeModal() {
    setModal("");
    setError("");
    const params = new URLSearchParams(window.location.search);
    params.delete("action");
    window.history.replaceState(null, "", `/?${params}`);
  }
  const mutate: Mutation = async (input, notice) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as Record<string, string>;
      if (!response.ok) throw new Error(result.error);
      const params = new URLSearchParams(window.location.search);
      if (result.householdId) {
        params.set("household", result.householdId);
        params.delete("calculation");
        setCalcId("");
      }
      if (result.calculationId) {
        params.set("calculation", result.calculationId);
        params.delete("view");
        params.delete("action");
        setCalcId(result.calculationId);
        setSection("bills");
      }
      window.history.replaceState(null, "", `/?${params}`);
      await refresh();
      setMessage(notice);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const house = data?.household;
  const leader = house?.leader_id === data?.user?.userId;
  const calc = data?.calculations.find((c) => c.id === calcId);
  function openCalculation(id: string) {
    setCalcId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("calculation", id);
    else params.delete("calculation");
    params.set("view", "bills");
    params.delete("action");
    window.history.replaceState(null, "", `/?${params}`);
    setSection("bills");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function navigation(next: string) {
    setSection(next);
    setCalcId("");
    const params = new URLSearchParams(window.location.search);
    params.delete("calculation");
    params.delete("action");
    params.set("view", next);
    window.history.replaceState(null, "", `/?${params}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function copyId() {
    try {
      await navigator.clipboard.writeText(house!.id);
      setMessage("Household ID copied. Share the password separately.");
    } catch {
      setError("Could not copy. Select and copy the household ID shown below.");
    }
  }
  const actionsDue =
    data?.calculations.filter((c) => {
      const p = c.participants.find((p) => p.user_id === data.user?.userId);
      return c.status === "collecting"
        ? !p?.attendance
        : p &&
            p.receipt_status !== "approved" &&
            (c.result?.shares.find((s) => s.id === p.id)?.cents || 0) > 0;
    }).length || 0;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/?view=home">
          <span className="brand-icon">
            <Bolt size={23} fill="currentColor" />
          </span>
          <span>
            household<span className="brand-light">watts</span>
            <small>A fair share of home.</small>
          </span>
        </a>
        <div className="house-switch">
          <span className="house-icon">
            <House size={21} />
          </span>
          <div>
            <small>YOUR HOUSEHOLD</small>
            {data?.households.length ? (
              <select
                aria-label="Select household"
                value={house?.id || ""}
                onChange={(e) => {
                  window.history.replaceState(
                    null,
                    "",
                    `/?household=${e.target.value}`,
                  );
                  setCalcId("");
                  refresh().catch((e) => setError(e.message));
                }}
              >
                {data.households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            ) : (
              <strong>A place to call home</strong>
            )}
          </div>
        </div>
        <nav aria-label="Main navigation">
          <button
            className={section === "bills" ? "active" : ""}
            onClick={() => navigation("bills")}
          >
            <CalendarDays size={19} /> Calculations
            {actionsDue > 0 && <span className="nav-count">{actionsDue}</span>}
          </button>
          <button
            className={section === "household" ? "active" : ""}
            onClick={() => navigation("household")}
          >
            <Users size={19} /> Household
          </button>
          <button
            className={section === "how" ? "active" : ""}
            onClick={() => navigation("how")}
          >
            <HelpCircle size={19} /> How it works
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Leaf size={24} />
            <p>
              Shared home.
              <br />
              Fairer bills.
              <br />
              <strong>One less thing to figure out.</strong>
            </p>
          </div>
          {data?.profile ? (
            <div className="profile">
              <span className="avatar">{initials(data.profile.name)}</span>
              <div>
                <strong>{data.profile.name}</strong>
                <small>
                  {leader ? "Household leader" : "Household member"}
                </small>
              </div>
              <a
                href="/signout-with-chatgpt?return_to=%2F"
                target="_top"
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </a>
            </div>
          ) : (
            <div className="privacy-note">
              <ShieldCheck size={15} /> Private to your household
            </div>
          )}
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>{house?.name || "A simpler way to share electricity"}</span>
          <div>
            {data?.user && (
              <a
                className="icon-button mobile-signout"
                href="/signout-with-chatgpt?return_to=%2F"
                target="_top"
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </a>
            )}
            <span className="topbar-privacy">
              <ShieldCheck size={15} /> Household members only
            </span>
            {data?.user ? (
              <button
                className="icon-button"
                aria-label="Refresh"
                onClick={() =>
                  refresh()
                    .then(() => setMessage("Up to date."))
                    .catch((e) => setError(e.message))
                }
              >
                <RefreshCw size={17} />
              </button>
            ) : (
              <a
                className="button small-button secondary"
                href={`/signin-with-chatgpt?return_to=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname + window.location.search)}`}
                target="_top"
              >
                Sign in
              </a>
            )}
          </div>
        </header>
        <div className="main-content">
          {error && (
            <div className="error global-error" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">
              <Bolt className="pulse" size={32} />
              <p>Getting your household ready…</p>
            </div>
          ) : section === "how" ? (
            <>
              <div className="page-heading">
                <div className="eyebrow">MADE FOR SHARED HOMES</div>
                <h1>Fair by the day.</h1>
                <p>A simple calculation everyone can understand.</p>
              </div>
              <HowItWorks />
              <div className="section-space">
                <Example />
              </div>
            </>
          ) : section === "household" ? (
            <>
              <HouseholdSetup
                signedIn={Boolean(data?.user)}
                hasHousehold={Boolean(house)}
                onCreate={() => beginHouseholdAction("create")}
                onJoin={() => beginHouseholdAction("join")}
              />
              {data?.user && data.profile && house && (
                <section
                  className="household-current"
                  aria-label="Current household"
                >
                  <>
                    <div className="page-heading">
                      <div>
                        <span className="eyebrow">
                          THE PEOPLE WHO MAKE IT HOME
                        </span>
                        <h2>{house.name}</h2>
                        <p>
                          {data.members.length} of {house.expected_members}{" "}
                          member slots · {house.currency} · Billing day{" "}
                          {house.cycle_day}
                        </p>
                      </div>
                      {leader && (
                        <button
                          className="button secondary"
                          onClick={() => setModal("settings")}
                        >
                          <Settings size={17} /> Settings
                        </button>
                      )}
                    </div>
                    <div className="detail-grid">
                      <div className="card">
                        <div className="section-heading">
                          <h2>Your housemates</h2>
                          {leader && (
                            <button
                              className="button primary small-button"
                              disabled={
                                data.members.length >= house.expected_members
                              }
                              onClick={() => setModal("invite")}
                            >
                              <Plus size={16} /> Add member
                            </button>
                          )}
                        </div>
                        {data.members.map((m, i) => (
                          <div className="member-row" key={m.id}>
                            <span className={`avatar avatar-${i % 4}`}>
                              {initials(m.name)}
                            </span>
                            <div className="member-info">
                              <strong>{m.name}</strong>
                              <small>
                                {m.phone}
                                {m.user_id === house.leader_id
                                  ? " · Leader"
                                  : ""}
                              </small>
                            </div>
                            <div className="member-amount">
                              <Badge tone={m.user_id ? "green" : "amber"}>
                                {m.user_id ? "Joined" : "Invited"}
                              </Badge>
                              {leader && m.user_id !== data.user?.userId && (
                                <a
                                  className="text-link"
                                  href={whatsapp(
                                    m.phone,
                                    `Hi ${m.name}! Join ${house.name} to split our electricity bills: ${hrefFor(house.id)} . Our household ID is ${house.id}. Register with ${m.phone}. I'll share the household password separately.`,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <MessageCircle size={14} /> WhatsApp invite
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {data.members.length < house.expected_members && (
                          <p className="small">
                            {house.expected_members - data.members.length} more
                            member
                            {house.expected_members - data.members.length === 1
                              ? ""
                              : "s"}{" "}
                            to add before your first calculation.
                          </p>
                        )}
                      </div>
                      <div className="card">
                        <LockKeyhole className="feature-icon" />
                        <h2>A private place for your bills.</h2>
                        <p>
                          Housemates sign in, register their invited phone
                          number, then join using this ID and your household
                          password.
                        </p>
                        <label className="field">
                          <span>Household ID</span>
                          <code className="household-id">{house.id}</code>
                        </label>
                        <button
                          className="button secondary wide"
                          onClick={copyId}
                        >
                          <Copy size={16} /> Copy household ID
                        </button>
                        <p className="small">
                          Share the password separately. New members are
                          included in future calculations.
                        </p>
                      </div>
                    </div>
                  </>
                </section>
              )}
            </>
          ) : section === "home" || !data?.user ? (
            <>
              <div className="welcome-hero">
                <div>
                  <span className="eyebrow">
                    <span className="tiny-line" /> ONE HOME. ONE LESS HEADACHE.
                  </span>
                  <h1>
                    A fair share,
                    <br />
                    down to the <span>day.</span>
                  </h1>
                  <p>
                    Some housemates stay all month. Others come and go.
                    <br className="desktop-break" /> Split the electricity bill
                    around the life you actually live.
                  </p>
                  {data?.user ? (
                    <button
                      className="button primary"
                      onClick={() => beginHouseholdAction("create")}
                    >
                      <House size={18} /> Set up your household
                    </button>
                  ) : (
                    <>
                      <a
                        className="button primary"
                        href={`/signin-with-chatgpt?return_to=${encodeURIComponent("/?view=household&action=create")}`}
                        target="_top"
                      >
                        <House size={18} /> Set up your household
                      </a>
                      <span className="hero-caption">
                        <LockKeyhole size={14} /> Sign in with ChatGPT to get
                        started
                      </span>
                    </>
                  )}
                </div>
                <div className="hero-illustration" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="house-drawing">
                    <div className="roof" />
                    <div className="house-body">
                      <div className="window window-one" />
                      <div className="window window-two" />
                      <div className="door">
                        <Bolt size={32} />
                      </div>
                    </div>
                    <div className="ground" />
                  </div>
                  <span className="floating-label label-one">
                    <Check size={14} /> Every day counts
                  </span>
                  <span className="floating-label label-two">
                    <Users size={14} /> Better together
                  </span>
                </div>
              </div>
              <div className="landing-grid">
                <Example />
                <div className="getting-started">
                  <span className="eyebrow">LESS ADMIN. MORE LIVING.</span>
                  <h2>
                    From bill to settled,
                    <br />
                    all in one place.
                  </h2>
                  {[
                    [
                      House,
                      "Bring your household together",
                      "One household ID, a private password, and a place for everyone.",
                    ],
                    [
                      CalendarDays,
                      "Tell us when you were home",
                      "Choose the full period, selected dates, or no days at all.",
                    ],
                    [
                      CheckCheck,
                      "Split, pay, and settle up",
                      "See everyone’s share. Upload a receipt. Let your leader confirm it.",
                    ],
                  ].map(([Icon, title, copy]) => {
                    const I = Icon as typeof House;
                    return (
                      <div className="step" key={String(title)}>
                        <span>
                          <I size={20} />
                        </span>
                        <div>
                          <h3>{String(title)}</h3>
                          <p>{String(copy)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : !data.profile ? (
            <div className="onboarding card">
              <span className="eyebrow">WELCOME HOME</span>
              <h1>First, a little about you.</h1>
              <ProfileForm mutate={mutate} busy={busy} />
            </div>
          ) : !house ? (
            <HouseholdSetup
              signedIn
              onCreate={() => setModal("createHousehold")}
              onJoin={() => setModal("join")}
            />
          ) : calc ? (
            <BillDetail
              key={calc.id}
              calc={calc}
              data={data}
              mutate={mutate}
              busy={busy}
              refresh={refresh}
              onError={(s) =>
                s.includes("copied") ? setMessage(s) : setError(s)
              }
              onBack={() => openCalculation("")}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A FAIR SHARE OF HOME</span>
                  <h1>Your electricity, together.</h1>
                  <p>One place for the bill, the days, and everyone’s share.</p>
                </div>
                {leader && (
                  <button
                    className="button primary"
                    onClick={() => setModal("newBill")}
                    disabled={data.members.length !== house.expected_members}
                  >
                    <Plus size={18} /> New calculation
                  </button>
                )}
              </div>
              <div className="house-banner">
                <div className="banner-icon">
                  <House size={28} />
                </div>
                <div>
                  <h2>{house.name}</h2>
                  <p>
                    {house.expected_members} housemates · Monthly billing day{" "}
                    {house.cycle_day}
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => navigation("household")}
                >
                  <Users size={16} /> Manage household
                </button>
              </div>
              <div className="metrics">
                <div className="metric">
                  <span>Monthly calculations</span>
                  <strong>
                    {data.calculations.length.toString().padStart(2, "0")}
                  </strong>
                  <small>All your household’s bills</small>
                </div>
                <div className="metric">
                  <span>Waiting on you</span>
                  <strong>{actionsDue.toString().padStart(2, "0")}</strong>
                  <small>Attendance or payment to complete</small>
                </div>
                <div className="metric">
                  <span>Housemates joined</span>
                  <strong>
                    {data.members.filter((m) => m.user_id).length}
                    <em> / {house.expected_members}</em>
                  </strong>
                  <small>Good things are better shared</small>
                </div>
              </div>
              <div className="card calculations-card">
                <div className="section-heading">
                  <h2>Monthly calculations</h2>
                  <Badge>{data.calculations.length} bills</Badge>
                </div>
                {data.calculations.length ? (
                  <div className="calculation-list">
                    {data.calculations.map((c) => (
                      <button
                        className="calculation-row"
                        key={c.id}
                        onClick={() => openCalculation(c.id)}
                      >
                        <div className="bill-icon">
                          <FileText size={23} />
                        </div>
                        <div className="bill-info">
                          <h3>{monthLabel(c.month)}</h3>
                          <span>
                            {dayLabel(c.start)} – {dayLabel(c.end)} ·{" "}
                            {c.participants.filter((p) => p.attendance).length}/
                            {c.participants.length} responded
                          </span>
                        </div>
                        <Badge
                          tone={c.status === "finalized" ? "green" : "amber"}
                        >
                          {c.status === "finalized"
                            ? "Finalized"
                            : "Collecting days"}
                        </Badge>
                        <strong>{money(c.total_cents, c.currency)}</strong>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <CalendarDays size={36} />
                    <h3>Your first fair split starts here.</h3>
                    <p>
                      {data.members.length !== house.expected_members
                        ? "Add all your housemates, then create the first monthly calculation."
                        : leader
                          ? "Have the electricity bill ready? Add its amount and billing period."
                          : "Your leader can create a monthly calculation once the bill arrives."}
                    </p>
                    {data.members.length !== house.expected_members && (
                      <button
                        className="button secondary"
                        onClick={() => navigation("household")}
                      >
                        Go to household
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="mini-explainer">
                <Leaf size={22} />
                <div>
                  <strong>Fairness is in the details.</strong>
                  <p>
                    Your share is based on the days you stayed and who else was
                    home.{" "}
                    <button
                      className="text-link inline"
                      onClick={() => navigation("how")}
                    >
                      See how it works
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}
          {modal && (
            <Modal
              key={modal}
              title={
                {
                  profile: "Complete your profile",
                  createHousehold: "Create your household",
                  join: "Join your household",
                  settings: "Household settings",
                  invite: "Add a housemate",
                  newBill: "New monthly calculation",
                }[modal] || ""
              }
              close={closeModal}
            >
              {modal === "profile" && (
                <ProfileForm mutate={mutate} busy={busy} />
              )}
              {(modal === "createHousehold" || modal === "settings") && (
                <HouseForm
                  house={modal === "settings" ? house! : undefined}
                  mutate={mutate}
                  busy={busy}
                  close={() => setModal("")}
                />
              )}
              {modal === "newBill" && house && (
                <NewBill
                  house={house}
                  mutate={mutate}
                  busy={busy}
                  close={() => setModal("")}
                />
              )}
              {modal === "join" && (
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const result = await mutate(
                      {
                        action: "join",
                        householdId: f.get("id"),
                        password: f.get("password"),
                      },
                      "Welcome to your household.",
                    );
                    if (result) setModal("");
                  }}
                >
                  <p>
                    Your profile phone number must match the invitation from
                    your leader.
                  </p>
                  <Field label="Household ID">
                    <input name="id" required defaultValue={joinHouseholdId} />
                  </Field>
                  <Field label="Household password">
                    <input
                      name="password"
                      type="password"
                      minLength={10}
                      maxLength={128}
                      required
                    />
                  </Field>
                  <button className="button primary" disabled={busy}>
                    {busy ? "Joining…" : "Join household"}
                  </button>
                </form>
              )}
              {modal === "invite" && house && (
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const result = await mutate(
                      {
                        action: "invite",
                        householdId: house.id,
                        name: f.get("name"),
                        phone: f.get("phone"),
                      },
                      "Housemate added. Use their WhatsApp invite button to share the link.",
                    );
                    if (result) setModal("");
                  }}
                >
                  <p>
                    Add their name and international phone number. You can send
                    their invitation from the household list.
                  </p>
                  <Field label="Housemate’s name">
                    <input name="name" required maxLength={80} />
                  </Field>
                  <Field label="Phone number">
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+60123456789"
                    />
                  </Field>
                  <button className="button primary" disabled={busy}>
                    {busy ? "Adding…" : "Add housemate"}
                  </button>
                </form>
              )}
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
            </Modal>
          )}
        </div>
        <footer>
          <span>
            <Bolt size={13} /> householdwatts
          </span>
          <span>A little less admin. A little more home.</span>
        </footer>
      </main>
      {message && (
        <div className="toast" role="status">
          <Check size={18} />
          {message}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
