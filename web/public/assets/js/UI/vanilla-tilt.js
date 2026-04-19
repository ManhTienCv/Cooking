/**
 * Tên file: vanilla-tilt.js
 * Công dụng: Thư viện hiệu ứng nghiêng 3D.
 * Chức năng: 
 * - Tạo hiệu ứng nghiêng (Tilt) khi di chuột vào thẻ card.
 * - (Thư viện bên thứ 3).
 */
/**
 * Lightweight Vanilla Tilt Effect
 * Adds a 3D tilt effect to elements with the 'data-tilt' attribute.
 */
class VanillaTilt {
    constructor(element, options = {}) {
        this.element = element;
        this.settings = Object.assign({
            max: 15,            // Max tilt rotation (degrees)
            perspective: 1000,  // Transform perspective (px)
            scale: 1.05,        // Scale on hover
            speed: 400,         // Transition speed (ms)
            glare: true,       // Add glare effect
            "max-glare": 0.3    // Max glare opacity
        }, options);

        this.init();
    }

    init() {
        this.element.style.transformStyle = "preserve-3d";
        this.element.style.transform = `perspective(${this.settings.perspective}px)`;

        if (this.settings.glare) {
            this.prepareGlare();
        }

        this.addEventListeners();
    }

    addEventListeners() {
        this.onMouseEnterBind = this.onMouseEnter.bind(this);
        this.onMouseMoveBind = this.onMouseMove.bind(this);
        this.onMouseLeaveBind = this.onMouseLeave.bind(this);

        this.element.addEventListener("mouseenter", this.onMouseEnterBind);
        this.element.addEventListener("mousemove", this.onMouseMoveBind);
        this.element.addEventListener("mouseleave", this.onMouseLeaveBind);
    }

    prepareGlare() {
        if (!this.glareElement) {
            this.glareElement = document.createElement("div");
            this.glareElement.classList.add("js-tilt-glare");
            this.glareElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                border-radius: inherit;
                pointer-events: none;
                z-index: 10;
            `;

            this.glareInner = document.createElement("div");
            this.glareInner.classList.add("js-tilt-glare-inner");
            this.glareInner.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                pointer-events: none;
                background-image: linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%);
                width: 200%;
                height: 200%;
                transform: rotate(180deg) translate(-50%, -50%);
                transform-origin: 0% 0%;
                opacity: 0;
            `;

            this.glareElement.appendChild(this.glareInner);
            this.element.appendChild(this.glareElement);
        }
    }

    onMouseEnter() {
        this.element.style.transition = `none`;
        if (this.glareInner) {
            this.glareInner.style.transition = `none`;
        }
    }

    onMouseMove(event) {
        const rect = this.element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const xPercentage = x / rect.width;
        const yPercentage = y / rect.height;

        const xRotation = (this.settings.max * -1) + (xPercentage * this.settings.max * 2); // -max to max
        const yRotation = this.settings.max - (yPercentage * this.settings.max * 2); // max to -max

        this.updateElementPosition(xRotation, yRotation);

        if (this.settings.glare) {
            this.updateGlare(xPercentage, yPercentage);
        }
    }

    onMouseLeave() {
        this.element.style.transition = `transform ${this.settings.speed}ms cubic-bezier(.03,.98,.52,.99)`;
        this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

        if (this.glareInner) {
            this.glareInner.style.transition = `opacity ${this.settings.speed}ms cubic-bezier(.03,.98,.52,.99)`;
            this.glareInner.style.opacity = 0;
        }
    }

    updateElementPosition(x, y) {
        // Reverse x and y for correct tilt direction:
        // Moving mouse right (positive x) should rotate Y axis positively (right side goes down/away? No, usually right side comes up)
        // Let's stick to standard logic:
        // RotateY: positive = right side moves towards viewer (screen right comes out)
        // RotateX: positive = top side moves away from viewer (screen top goes in)

        // Actually, standard CSS rotateY(10deg) moves the right side AWAY (into screen) and left side TOWARDS.
        // So if mouse is on right, we want right side to go DOWN (away). So positive rotateY is correct for mouse-right?
        // Wait, if mouse is on right, we want the element to tilt towards the mouse? Or away?
        // Usually "tilt" means it tips towards the cursor.
        // If mouse is right, right side goes DOWN (away)? No, that's tipping away.
        // If mouse is right, right side should come UP (towards)? No, usually it mimics a physical object being pushed.
        // If I push the right side, it goes away.
        // Let's use the calculated values:
        // xRotation (based on X position) controls RotateY.
        // yRotation (based on Y position) controls RotateX.

        // My calculation:
        // x=0 (left) -> xRotation = -max
        // x=1 (right) -> xRotation = max

        // If I am on the left, xRotation is negative. rotateY(-10deg) -> Left side moves AWAY.
        // If I am on the right, xRotation is positive. rotateY(10deg) -> Right side moves AWAY.
        // This feels like "pushing" the element. Correct.

        // y=0 (top) -> yRotation = max
        // y=1 (bottom) -> yRotation = -max

        // If I am on top, yRotation is positive. rotateX(10deg) -> Top side moves AWAY.
        // If I am on bottom, yRotation is negative. rotateX(-10deg) -> Bottom side moves AWAY.
        // This also feels like pushing. Correct.

        // Wait, the variable names in onMouseMove were:
        // xRotation derived from X percentage. This should control Y axis rotation.
        // yRotation derived from Y percentage. This should control X axis rotation.

        // Let's swap them in the transform string to be correct:
        // rotateX should use the Y-based calculation (yRotation variable)
        // rotateY should use the X-based calculation (xRotation variable)

        // But wait, in onMouseMove:
        // const xRotation = (this.settings.max * -1) + (xPercentage * this.settings.max * 2);
        // This maps 0..1 to -max..max.
        // If mouse is left (0), val is -max. rotateY(-max) -> left away.

        // Let's just apply and see.

        this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(${yRotation}deg) rotateY(${xRotation}deg) scale3d(${this.settings.scale}, ${this.settings.scale}, ${this.settings.scale})`;
    }

    updateGlare(xPercentage, yPercentage) {
        const angle = Math.atan2(yPercentage - 0.5, xPercentage - 0.5) * (180 / Math.PI);
        const opacity = Math.min(
            this.settings["max-glare"],
            Math.sqrt(Math.pow(xPercentage - 0.5, 2) + Math.pow(yPercentage - 0.5, 2)) * 2 // Distance from center * 2
        );

        this.glareInner.style.transform = `rotate(${angle}deg) translate(-50%, -50%)`;
        this.glareInner.style.opacity = opacity;
    }
}

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll("[data-tilt]");
    elements.forEach(element => new VanillaTilt(element));
});
