import { FormEvent, useRef, useState } from "react";
import { Entry, Product } from "../../api";
import { householdDateKey, money } from "../../lib/formatters";
import { Section, typeFor } from "../../app/sectionConfig";
import { useDialogFocusTrap } from "../../hooks/useDialogFocusTrap";

export function EntryForm({
  active,
  entry,
  initialType,
  products,
  close,
  save,
}: {
  active: Section;
  entry: Entry | null;
  initialType: string;
  products: Entry[];
  close: () => void;
  save: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const [type, setType] = useState(
    entry?.type || initialType || typeFor[active] || "expense",
  );
  const [name, setName] = useState(entry?.name || ""),
    [unit, setUnit] = useState(entry?.unit || "");
  const dialogRef = useRef<HTMLFormElement>(null);
  const hasAmount = type !== "attendance",
    hasQuantity = type === "delivery",
    hasUnit = ["delivery", "product"].includes(type),
    amountLabel =
      type === "product"
        ? "Current rate per unit (₹)"
        : type === "staff"
          ? "Monthly salary (₹)"
          : type === "delivery"
            ? "Recorded charge, if known (₹)"
            : "Amount (₹)",
    dateFieldLabel =
      type === "staff"
        ? "Joining date"
        : type === "attendance"
          ? "Attendance date"
          : type === "product"
            ? "Rate set on"
            : type === "delivery"
              ? "Delivery date"
              : type === "expense"
                ? "Payment date"
                : type === "bill"
                  ? "Bill date"
                  : "Date",
    statusOptions =
      type === "attendance"
        ? ["present", "absent"]
        : ["recorded", "pending", "paid", "upcoming"],
    showStatus = !["product", "staff"].includes(type);
  function changeName(value: string) {
    setName(value);
    if (type === "delivery") {
      const product = products.find(
        (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
      );
      if (product) setUnit(product.unit);
    }
  }
  useDialogFocusTrap(dialogRef, close);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="quick-modal entry-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-dialog-title"
        onSubmit={save}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {entry ? "EDIT ENTRY" : "NEW LEDGER ENTRY"}
            </span>
            <h2 id="entry-dialog-title">
              {entry ? "Update record" : "Add to your ledger"}
            </h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="Close entry form"
            onClick={close}
          >
            ×
          </button>
        </div>
        <label>
          Entry type
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!!entry}
          >
            {[
              ["delivery", "Delivery"],
              ["expense", "Household expense"],
              ["bill", "Monthly bill"],
              ["product", "Product & rate"],
              ["staff", "Staff member"],
              ["attendance", "Attendance"],
              ["salary", "Salary"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          {type === "product"
            ? "Product name"
            : type === "delivery"
              ? "Product or item"
              : "Name"}
          <input
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => changeName(e.target.value)}
            list={
              type === "delivery" && products.length
                ? "delivery-product-options"
                : undefined
            }
            autoComplete={type === "delivery" ? "off" : undefined}
            placeholder={
              type === "delivery"
                ? "Choose a product or enter an item"
                : "e.g. Electricity bill"
            }
          />
          {type === "delivery" && products.length > 0 && (
            <datalist id="delivery-product-options">
              {products.map((product) => (
                <option key={product._id} value={product.name} />
              ))}
            </datalist>
          )}
        </label>
        {type === "delivery" &&
          products.some(
            (product) =>
              product.name.toLowerCase() === name.trim().toLowerCase(),
          ) && (
            <p className="form-hint">
              This copies the product name and unit into the delivery record.
              The API does not keep a product link or calculate its bill.
            </p>
          )}
        <div className="form-grid">
          <label>
            Category
            <input
              name="category"
              maxLength={80}
              defaultValue={entry?.category}
              placeholder={type === "product" ? "e.g. Dairy" : "e.g. Groceries"}
            />
          </label>
          {hasAmount && (
            <label>
              {amountLabel}
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={entry?.amount || ""}
                placeholder="0.00"
                required={type === "product"}
              />
              {type === "delivery" && (
                <small>
                  Optional manual charge; it is not calculated from the product
                  rate.
                </small>
              )}
            </label>
          )}
          {hasQuantity && (
            <label>
              Delivered quantity
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={entry?.quantity || ""}
                required
              />
            </label>
          )}
          {hasUnit && (
            <label>
              Unit
              <input
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                list="common-units"
                placeholder="litre, kg, packet…"
                required
              />
              <datalist id="common-units">
                {["litre", "ml", "kg", "gram", "packet", "piece", "dozen"].map(
                  (value) => (
                    <option key={value} value={value} />
                  ),
                )}
              </datalist>
            </label>
          )}
        </div>
        <div className="form-grid">
          <label>
            {dateFieldLabel}
            <input
              name="date"
              type="date"
              required
              defaultValue={
                entry?.date?.slice(0, 10) || householdDateKey(new Date())
              }
            />
          </label>
          {["bill", "salary"].includes(type) && (
            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                defaultValue={entry?.dueDate?.slice(0, 10)}
              />
            </label>
          )}
          {showStatus && (
            <label>
              Status
              <select
                key={type}
                name="status"
                required
                defaultValue={
                  entry?.status || (type === "attendance" ? "" : "recorded")
                }
              >
                {type === "attendance" && (
                  <option value="" disabled>
                    Select status
                  </option>
                )}
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label>
          Notes
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={entry?.notes}
            rows={2}
            placeholder="Optional details"
          />
        </label>
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary">
            {entry ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
