export type StructuredDataObject = {
  readonly [key: string]: unknown;
};

interface StructuredDataProps {
  readonly data: StructuredDataObject;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
