export type TestimonialPublicationFields = {
  customer_name: string;
  text: string;
  rating: number | null;
  source: string | null;
  is_approved: boolean;
};

export function testimonialContentChanged(previous: TestimonialPublicationFields, next: TestimonialPublicationFields) {
  return previous.customer_name !== next.customer_name || previous.text !== next.text
    || previous.rating !== next.rating || previous.source !== next.source;
}

export function needsTestimonialAttestation(previous: TestimonialPublicationFields, next: TestimonialPublicationFields) {
  return next.is_approved && (!previous.is_approved || testimonialContentChanged(previous, next));
}
