import assert from 'node:assert/strict';
import test from 'node:test';
import { needsTestimonialAttestation, testimonialContentChanged } from '../src/lib/testimonial-publication.ts';

const published = {
  customer_name: 'Cliente real',
  text: 'Texto autorizado pelo cliente.',
  rating: 5,
  source: 'WhatsApp',
  is_approved: true
};

test('unchanged published legacy content can be saved without rewriting its status', () => {
  assert.equal(testimonialContentChanged(published, published), false);
  assert.equal(needsTestimonialAttestation(published, published), false);
});

test('publishing a draft requires a fresh attestation', () => {
  assert.equal(needsTestimonialAttestation({ ...published, is_approved: false }, published), true);
});

test('changing a published claim requires a fresh attestation', () => {
  assert.equal(needsTestimonialAttestation(published, { ...published, text: 'Texto modificado.' }), true);
  assert.equal(needsTestimonialAttestation(published, { ...published, rating: 4 }), true);
});

test('editing or hiding a draft does not require attestation', () => {
  assert.equal(needsTestimonialAttestation(
    { ...published, is_approved: false },
    { ...published, text: 'Rascunho novo.', is_approved: false }
  ), false);
});
