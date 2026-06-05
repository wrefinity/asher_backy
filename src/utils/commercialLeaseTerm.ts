export function formatCommercialLeaseTerm(
  minimumLeaseTerm?: number | null,
  maximumLeaseTerm?: number | null,
  leaseTermUnit?: string | null
): string | undefined {
  const min =
    minimumLeaseTerm != null && minimumLeaseTerm > 0 ? minimumLeaseTerm : null;
  const max =
    maximumLeaseTerm != null && maximumLeaseTerm > 0 ? maximumLeaseTerm : null;
  const unit = (leaseTermUnit || "YEARS").toLowerCase();

  if (!min && !max) return undefined;
  if (min && max && max !== min) return `${min}–${max} ${unit}`;
  if (min && max) return `${min} ${unit}`;
  if (min) return `${min} ${unit}`;
  return `Up to ${max} ${unit}`;
}

export function resolveCommercialLeaseTerm(data: {
  leaseTerm?: string | null;
  minimumLeaseTerm?: number | null;
  maximumLeaseTerm?: number | null;
  leaseTermUnit?: string | null;
}): string | undefined {
  const trimmed = data.leaseTerm?.trim();
  if (trimmed) return trimmed;
  return formatCommercialLeaseTerm(
    data.minimumLeaseTerm,
    data.maximumLeaseTerm,
    data.leaseTermUnit
  );
}
