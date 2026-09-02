/** Shared document image limits (keep uploads small for limited server resources). */
export const IMAGE_MAX_INPUT_BYTES = 5 * 1024 * 1024
export const IMAGE_MAX_UPLOAD_BYTES = 800 * 1024
export const IMAGE_MAX_WIDTH = 1600
export const IMAGE_MAX_OUTPUT_BYTES = 800 * 1024
export const IMAGE_MAX_INPUT_MB = 5
export const IMAGE_MAX_UPLOAD_KB = 800

export function imageInputLimitMessage(): string {
  return `Images must be under ${IMAGE_MAX_INPUT_MB} MB. They are resized to ${IMAGE_MAX_WIDTH}px wide and compressed to about ${IMAGE_MAX_UPLOAD_KB} KB before upload.`
}
