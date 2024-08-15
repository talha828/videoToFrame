const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

document.getElementById('video-upload').addEventListener('change', async function(event) {
    const videoFile = event.target.files[0];
    if (!videoFile) {
        console.error('No file selected.');
        return;
    }

    if (!ffmpeg.isLoaded()) {
        try {
            await ffmpeg.load();
        } catch (err) {
            console.error('Failed to load ffmpeg.wasm', err);
            return;
        }
    }

    try {
        // Show progress bar
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        progressContainer.style.display = 'block';

        const videoData = await fetchFile(videoFile);
        ffmpeg.FS('writeFile', 'input.mp4', videoData);

        // Extract frames at 1 frame per second
        await ffmpeg.run('-i', 'input.mp4', '-vf', 'fps=1', 'output_%04d.jpg');

        const framesContainer = document.getElementById('frames-container');
        framesContainer.innerHTML = ''; // Clear previous frames

        const files = ffmpeg.FS('readdir', '/');
        const frameFiles = files.filter(file => file.endsWith('.jpg'));

        let zip = new JSZip();
        let totalFrames = frameFiles.length;

        for (let i = 0; i < frameFiles.length; i++) {
            const frameFile = frameFiles[i];
            const data = ffmpeg.FS('readFile', frameFile);
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'image/jpeg' }));

            const imgElement = document.createElement('img');
            imgElement.src = url;
            imgElement.classList.add('frame-img');
            framesContainer.appendChild(imgElement);

            zip.file(frameFile, data.buffer);

            // Update progress
            const progress = Math.round(((i + 1) / totalFrames) * 100);
            progressBar.style.width = `${progress}%`;
            progressBar.innerText = `${progress}%`;
        }

        document.getElementById('download-btn').disabled = false;

        document.getElementById('download-btn').addEventListener('click', function() {
            zip.generateAsync({ type: 'blob' }).then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'frames.zip';
                link.click();
            });
        });

        // Hide progress bar when done
        progressContainer.style.display = 'none';

    } catch (err) {
        console.error('Error processing video:', err);
    }
});
