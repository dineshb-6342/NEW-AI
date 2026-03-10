# TODO - Fix Image/Video Fetching from Local Files and Google

## Task: Fix error for fetching image/video from local files as well as from Google image

### Steps:

- [x] 1. Add local media mapping in Whiteboard.tsx with keywords for matching user input
- [x] 2. Modify fetchImagesFromSentence to check local files first, then fallback to API
- [x] 3. Modify fetchVideosFromSentence to check local files first, then fallback to API
- [x] 4. Add local media browser UI component for direct file selection
- [x] 5. Test the implementation

### Implementation Details:

#### Local Images Mapping:
- "flaming left hand rule" -> /images/flamings left hand rule.jpg
- "graphics" -> /images/graphics image.jpg
- "nuclear fission" -> /images/nuclear fission image.jpg
- "nuclear reactor" -> /images/nuclear reactor image.jpg
- "optical fibre"/"optical fiber" -> /images/optical fibre image.jpg
- "transformer" -> /images/transformer image.jpg

#### Local Videos Mapping:
- "ac dc"/"ac-dc" -> /videos/ac dc video.mp4
- "nuclear fission" -> /videos/nuclear fission video.mp4
- "nuclear reactor" -> /videos/nuclear reactor video.mp4
- "optical fibre"/"optical fiber" -> /videos/optical fibre video.mp4
- "total internal reflection" -> /videos/total internal reflection.mp4
- "transformer" -> /videos/transformer video.mp4
- "dc motor"/"working of dc motor" -> /videos/working of dc motor.mp4

### Completed:
All tasks completed. The implementation now:
1. Checks local files first when user types a topic (speech or text input)
2. Falls back to Wikipedia API if no local match is found
3. Provides a local media browser button (📁) in toolbar for direct selection

