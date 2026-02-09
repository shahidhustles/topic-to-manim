# Manim Code Patterns

Best practices and patterns for generating high-quality Manim Community Edition code.

## Basic Structure

```python
from manim import *

class ConceptAnimation(Scene):  # or ThreeDScene for 3D
    def construct(self):
        # Setup phase
        self.setup_scene()

        # Scene 1: Foundation concept
        self.scene_foundation()

        # Scene 2: Build up
        self.scene_buildup()

        # Scene 3: Target concept
        self.scene_target()

    def setup_scene(self):
        """Initialize shared elements and colors"""
        self.colors = {
            'primary': BLUE,
            'secondary': YELLOW,
            'highlight': GOLD,
            'axes': WHITE
        }

    def scene_foundation(self):
        """First concept - foundation level"""
        pass

    def scene_buildup(self):
        """Intermediate concepts"""
        pass

    def scene_target(self):
        """Final target concept"""
        pass
```

## LaTeX Handling

### Always Use Raw Strings

```python
# Correct
equation = MathTex(r"E = mc^2")
fraction = MathTex(r"\frac{a}{b}")
integral = MathTex(r"\int_0^\infty f(x) dx")

# Incorrect - will cause errors
equation = MathTex("E = mc^2")  # Works but bad practice
fraction = MathTex("\frac{a}{b}")  # FAILS - backslash issues
```

### Complex Equations

```python
# Multi-line equations
schrodinger = MathTex(
    r"i\hbar\frac{\partial}{\partial t}\Psi",
    r"=",
    r"\hat{H}\Psi"
)

# Color specific parts
schrodinger[0].set_color(BLUE)   # Left side
schrodinger[2].set_color(GREEN)  # Right side
```

### Text with Math

```python
# Use Tex for mixed content
mixed = Tex(r"The energy ", r"$E$", r" equals ", r"$mc^2$")
mixed[1].set_color(BLUE)
mixed[3].set_color(YELLOW)
```

### Avoid Unicode Symbols in LaTeX

**CRITICAL: Never use Unicode symbols in MathTex or Tex strings!**

LaTeX cannot compile Unicode characters like ✓, ✗, →, ≠, etc. They will cause rendering failures.

```python
# Incorrect - Will FAIL
comparison = MathTex(r"5 > 2 \text{ ✓ (true)}")  # ❌ LaTeX error
arrow = MathTex(r"A → B")  # ❌ Fails
inequality = MathTex(r"x ≠ 0")  # ❌ Fails

# Correct - Use LaTeX commands or plain text
comparison = MathTex(r"5 > 2 \text{ (true)}")  # ✅ Works
arrow = MathTex(r"A \to B")  # ✅ Works
arrow_alt = MathTex(r"A \rightarrow B")  # ✅ Works
inequality = MathTex(r"x \neq 0")  # ✅ Works

# For checkmarks, use Text objects instead
checkmark = Text("✓", color=GREEN)  # ✅ Works (not in LaTeX)
label = Text("Valid: ✓", font_size=20)  # ✅ Works

# Or use LaTeX symbols
checkmark_latex = MathTex(r"\checkmark", color=GREEN)  # ✅ Requires amssymb package
```

**Common replacements:**

- `✓` → `\checkmark` or plain text in Text()
- `✗` → `\times` or plain text in Text()
- `→` → `\to` or `\rightarrow`
- `←` → `\leftarrow`
- `≠` → `\neq`
- `≤` → `\leq`
- `≥` → `\geq`
- `∞` → `\infty`
- `±` → `\pm`

## Animation Patterns

### Sequential Animations

```python
# One after another
self.play(FadeIn(axes))
self.play(Write(equation))
self.play(Create(graph))
self.wait(1)
```

### Simultaneous Animations

```python
# Multiple at once using AnimationGroup
self.play(
    FadeIn(axes),
    Write(title),
    run_time=2
)

# Or comma-separated
self.play(FadeIn(axes), Write(title))
```

### Smooth Transitions

```python
# Transform one object into another
self.play(Transform(old_equation, new_equation))

# Replace without animation artifact
self.play(ReplacementTransform(old, new))

# Fade transition
self.play(FadeOut(old), FadeIn(new))
```

## Positioning Patterns

### Relative Positioning

```python
# Edge positioning
equation.to_edge(UP)
graph.to_edge(LEFT, buff=1)

# Corner positioning
label.to_corner(UR)  # Upper right

# Relative to another object
label.next_to(equation, DOWN, buff=0.5)
arrow.next_to(point, RIGHT)
```

### Grouping and Arrangement

```python
# Vertical arrangement
equations = VGroup(eq1, eq2, eq3)
equations.arrange(DOWN, buff=0.5)
equations.to_edge(LEFT)

# Horizontal arrangement
labels = VGroup(l1, l2, l3)
labels.arrange(RIGHT, buff=1)
```

### Coordinate-Based

```python
# Absolute position
point.move_to(np.array([2, 1, 0]))
point.move_to(2*RIGHT + 1*UP)

# Shift relative
equation.shift(2*LEFT + 0.5*UP)
```

## Color Management

### Consistent Color Palette

```python
class ConceptAnimation(Scene):
    # Define colors as class attributes
    PRIMARY = BLUE
    SECONDARY = YELLOW
    HIGHLIGHT = GOLD
    AXES_COLOR = WHITE
    GRAPH_COLOR = GREEN

    def construct(self):
        equation = MathTex(r"E = mc^2").set_color(self.PRIMARY)
        highlight_box = SurroundingRectangle(equation, color=self.HIGHLIGHT)
```

### Color Transitions

```python
# Animate color change
self.play(equation.animate.set_color(RED))

# Highlight temporarily
self.play(
    equation.animate.set_color(GOLD),
    run_time=0.5
)
self.play(
    equation.animate.set_color(BLUE),
    run_time=0.5
)
```

## 3D Scene Patterns

### Basic 3D Setup

```python
class ThreeDConcept(ThreeDScene):
    def construct(self):
        # Set up 3D axes
        axes = ThreeDAxes()

        # Position camera
        self.set_camera_orientation(phi=75*DEGREES, theta=45*DEGREES)

        # Add ambient rotation
        self.begin_ambient_camera_rotation(rate=0.1)

        self.play(Create(axes))

        # Create 3D surface
        surface = Surface(
            lambda u, v: np.array([u, v, np.sin(u)*np.cos(v)]),
            u_range=[-3, 3],
            v_range=[-3, 3],
            resolution=(30, 30)
        )

        self.play(Create(surface))
        self.wait(5)
```

### Camera Movements

```python
# Move camera smoothly
self.move_camera(phi=60*DEGREES, theta=30*DEGREES, run_time=2)

# Zoom
self.move_camera(zoom=1.5, run_time=1)

# Frame movement
self.play(self.camera.frame.animate.shift(2*RIGHT))
```

## Value Tracking and Updates

### Dynamic Updates

```python
# Create tracker
momentum = ValueTracker(1)

# Create object that depends on tracker
wavelength = always_redraw(
    lambda: MathTex(
        rf"\lambda = {1/momentum.get_value():.2f}"
    ).to_edge(UP)
)

self.add(wavelength)

# Animate the tracker
self.play(momentum.animate.set_value(5), run_time=3)
```

### Updaters for Continuous Animation

```python
# Add updater to object
dot = Dot()
dot.add_updater(lambda m, dt: m.shift(0.5*RIGHT*dt))

self.add(dot)
self.wait(3)  # Dot moves continuously

dot.clear_updaters()  # Stop movement
```

## Error Prevention

### Common Fixes

```python
# Problem: LaTeX compilation error with Unicode symbols
# Solution: Never use Unicode (✓, →, ≠) in MathTex/Tex - use LaTeX commands
bad = MathTex(r"x ≠ 0")  # ❌ FAILS
good = MathTex(r"x \neq 0")  # ✅ Works
# Or use Text() for Unicode symbols
checkmark = Text("✓", color=GREEN)  # ✅ Works

# Problem: LaTeX rendering fails
# Solution: Use raw strings and double backslashes
eq = MathTex(r"\frac{d}{dx}")  # Correct

# Problem: Object not visible
# Solution: Check z_index for overlapping
foreground.set_z_index(1)
background.set_z_index(0)

# Problem: Animation too fast/slow
# Solution: Specify run_time
self.play(Create(complex_graph), run_time=3)

# Problem: Jerky transitions
# Solution: Use rate functions
self.play(
    Transform(a, b),
    rate_func=smooth,
    run_time=2
)
```

### Defensive Patterns

```python
# Check object exists before animating
if hasattr(self, 'previous_equation'):
    self.play(FadeOut(self.previous_equation))

# Group cleanup
def clear_scene(self):
    self.play(*[FadeOut(mob) for mob in self.mobjects])

# Safe color access
color = getattr(self, 'PRIMARY', BLUE)
```

## Scene Organization

### Breaking Complex Animations into Methods

```python
class QuantumTunneling(ThreeDScene):
    def construct(self):
        self.intro_foundation()
        self.show_wave_function()
        self.demonstrate_barrier()
        self.show_tunneling()
        self.conclusion()

    def intro_foundation(self):
        """Foundation concepts"""
        title = Text("Wave-Particle Duality")
        self.play(Write(title))
        self.wait(2)
        self.play(FadeOut(title))

    def show_wave_function(self):
        """Wave function visualization"""
        # Detailed implementation
        pass

    # ... other methods
```

### Reusable Components

```python
def create_labeled_equation(tex_string, label_text, color=BLUE):
    """Create equation with label below"""
    equation = MathTex(tex_string).set_color(color)
    label = Text(label_text, font_size=24).next_to(equation, DOWN)
    return VGroup(equation, label)

# Usage
energy_eq = create_labeled_equation(r"E = mc^2", "Mass-energy equivalence")
self.play(FadeIn(energy_eq))
```

---

## Problem-Specific Visual Patterns (JEE/NEET Mode)

### Color Coding System

```python
from manim import *

class ProblemScene(Scene):
    # Define color constants
    GIVEN_COLOR = GREEN
    UNKNOWN_COLOR = YELLOW
    FOCUS_COLOR = BLUE
    ANSWER_COLOR = GOLD
    INTERMEDIATE_COLOR = ORANGE

    def color_code_equation(self, equation, given_indices=[], unknown_indices=[], focus_indices=[]):
        """Apply color coding to MathTex equation"""
        for idx in given_indices:
            equation[0][idx].set_color(self.GIVEN_COLOR)
        for idx in unknown_indices:
            equation[0][idx].set_color(self.UNKNOWN_COLOR)
        for idx in focus_indices:
            equation[0][idx].set_color(self.FOCUS_COLOR)
        return equation
```

### Free Body Diagram (FBD)

```python
def create_fbd(self, forces):
    """
    Create a Free Body Diagram.

    Args:
        forces: dict like {'F_gravity': (DOWN, RED, 'mg'), 'F_normal': (UP, BLUE, 'N')}
                Format: {name: (direction_vector, color, label_text)}
    """
    # Central object
    obj = Dot(radius=0.15, color=WHITE).move_to(ORIGIN)
    obj_label = Text("m", font_size=20).next_to(obj, LEFT, buff=0.1)

    arrows = VGroup()
    labels = VGroup()

    for name, (direction, color, label_text) in forces.items():
        # Force arrow
        arrow = Arrow(
            obj.get_center(),
            obj.get_center() + direction * 1.5,
            buff=0.2,
            color=color,
            stroke_width=6
        )
        # Label
        label = MathTex(label_text, color=color).next_to(arrow.get_end(), direction * 0.5)

        arrows.add(arrow)
        labels.add(label)

    return VGroup(obj, obj_label, arrows, labels)

# Usage
forces = {
    'gravity': (DOWN, RED, r'mg'),
    'normal': (UP, BLUE, r'N'),
    'friction': (LEFT, ORANGE, r'f'),
    'applied': (RIGHT, GREEN, r'F')
}
fbd = self.create_fbd(forces)
self.play(FadeIn(fbd))
```

### Projectile Trajectory

```python
def create_trajectory(self, u, theta, g=10, x_max=None):
    """
    Create projectile trajectory visualization.

    Args:
        u: initial velocity (m/s)
        theta: angle in degrees
        g: acceleration due to gravity (m/s²)
        x_max: maximum x range to plot (auto-calculated if None)
    """
    theta_rad = np.radians(theta)
    u_x = u * np.cos(theta_rad)
    u_y = u * np.sin(theta_rad)

    # Calculate range
    time_of_flight = 2 * u_y / g
    R = u_x * time_of_flight
    h_max = (u_y ** 2) / (2 * g)

    if x_max is None:
        x_max = R * 1.1

    # Create axes
    axes = Axes(
        x_range=[0, x_max, x_max/5],
        y_range=[0, h_max * 1.2, h_max/2],
        x_length=8,
        y_length=4,
        axis_config={"include_tip": True}
    ).to_edge(DOWN)

    # Trajectory function
    def trajectory_func(x):
        return x * np.tan(theta_rad) - (g * x**2) / (2 * u**2 * np.cos(theta_rad)**2)

    trajectory = axes.plot(
        trajectory_func,
        x_range=[0, R],
        color=BLUE
    )

    # Mark special points
    max_height_dot = Dot(axes.c2p(R/2, h_max), color=GOLD)
    max_height_label = MathTex(r"h_{max}", color=GOLD).next_to(max_height_dot, UP)

    range_line = DashedLine(
        axes.c2p(R, 0),
        axes.c2p(R, 0) + UP * 0.5,
        color=GOLD
    )
    range_label = MathTex(r"R", color=GOLD).next_to(range_line, DOWN)

    return VGroup(axes, trajectory, max_height_dot, max_height_label, range_line, range_label)

# Usage
trajectory_viz = self.create_trajectory(u=20, theta=30, g=10)
self.play(Create(trajectory_viz))
```

### Circuit Diagram Elements

```python
def create_resistor(self, start, end, label="R"):
    """Create a resistor symbol"""
    direction = (end - start) / np.linalg.norm(end - start)
    length = np.linalg.norm(end - start)

    # Zigzag pattern
    zig_width = 0.15
    zig_count = 6
    points = [start]

    for i in range(zig_count):
        t = (i + 0.5) / zig_count
        mid = start + direction * length * t
        perp = np.array([-direction[1], direction[0], 0])
        points.append(mid + perp * zig_width * (1 if i % 2 == 0 else -1))
    points.append(end)

    resistor = VMobject().set_points_as_corners(points).set_color(WHITE)
    label_mob = MathTex(label).next_to(resistor, UP, buff=0.1)

    return VGroup(resistor, label_mob)

def create_battery(self, start, end):
    """Create a battery symbol"""
    mid = (start + end) / 2
    direction = end - start
    perp = np.array([-direction[1], direction[0], 0])
    perp = perp / np.linalg.norm(perp) * 0.3

    # Longer line (positive)
    line1 = Line(mid +perp * 0.7, mid - perp * 0.7, color=RED, stroke_width=4)
    # Shorter line (negative)
    line2 = Line(mid + direction * 0.2 + perp * 0.4,
                 mid + direction * 0.2 - perp * 0.4, color=WHITE, stroke_width=4)

    # Connecting wires
    wire1 = Line(start, mid + direction * 0.2, color=WHITE)
    wire2 = Line(mid, end, color=WHITE)

    return VGroup(line1, line2, wire1, wire2)

# Usage for series circuit
battery = self.create_battery(LEFT * 3, LEFT * 2)
resistor1 = self.create_resistor(LEFT * 2, ORIGIN, "R_1")
resistor2 = self.create_resistor(ORIGIN, RIGHT * 2, "R_2")
wire_back = Line(RIGHT * 2, LEFT * 3, color=WHITE)
circuit = VGroup(battery, resistor1, resistor2, wire_back)
```

### Mole Calculation Grid (Stoichiometry)

```python
def create_mole_grid(self, substances, given=None, find=None):
    """
    Create a mole calculation table for stoichiometry.

    Args:
        substances: list of substance names like ['CaCO₃', 'CaO', 'CO₂']
        given: dict like {'CaCO₃': {'mass': '5 g'}}
        find: dict like {'CO₂': ['mass']}
    """
    headers = ["Substance", "Moles (n)", "Mass (m)", "Molar Mass (M)"]

    # Create table
    table = Table(
        [[sub, "", "", ""] for sub in substances],
        col_labels=[Text(h, font_size=20) for h in headers],
        include_outer_lines=True
    ).scale(0.7)

    # Color code known values
    if given:
        for substance, values in given.items():
            row_idx = substances.index(substance)
            if 'mass' in values:
                # Highlight mass cell in GREEN
                cell = table.get_cell((row_idx + 2, 3))  # +2 for header row
                cell.set_fill(GREEN, opacity=0.3)

    if find:
        for substance, cols in find.items():
            row_idx = substances.index(substance)
            for col_name in cols:
                col_idx = {'moles': 2, 'mass': 3, 'molar_mass': 4}[col_name]
                cell = table.get_cell((row_idx + 2, col_idx))
                cell.set_fill(YELLOW, opacity=0.3)

    return table

# Usage
substances = ['CaCO₃', 'CO₂']
grid = self.create_mole_grid(
    substances,
    given={'CaCO₃': {'mass': '5 g'}},
    find={'CO₂': ['mass']}
)
self.play(FadeIn(grid))
```

### Coordinate Graph with Function

```python
def create_function_graph(self, func, x_range=(-5, 5), y_range=(-5, 5)):
    """Create coordinate axes and plot a function"""
    axes = Axes(
        x_range=[x_range[0], x_range[1], 1],
        y_range=[y_range[0], y_range[1], 1],
        x_length=8,
        y_length=6,
        axis_config={"include_numbers": True}
    )

    graph = axes.plot(func, color=BLUE)

    # Labels
    x_label = axes.get_x_axis_label("x")
    y_label = axes.get_y_axis_label("y")

    return VGroup(axes, graph, x_label, y_label)

# Usage for quadratic
def quadratic(x):
    return x**2 - 4*x + 3

graph_group = self.create_function_graph(
    quadratic,
    x_range=(-1, 5),
    y_range=(-2, 6)
)

# Mark vertex
vertex_x = 2
vertex_y = quadratic(vertex_x)
vertex_dot = Dot(graph_group[0].c2p(vertex_x, vertex_y), color=GOLD)
vertex_label = MathTex(r"(2, -1)", color=GOLD).next_to(vertex_dot, DOWN)
```

### Color-Coded Problem Display

```python
def display_problem(self, given_dict, find_list):
    """
    Display problem statement with color coding.

    Args:
        given_dict: {'u': '20 m/s', 'theta': '30°', 'g': '10 m/s²'}
        find_list: ['h_max', 'R']
    """
    # Given section
    given_title = Text("Given:", color=GREEN).scale(0.8)
    given_items = VGroup()
    for var, value in given_dict.items():
        item = MathTex(f"{var} = {value}", color=GREEN)
        given_items.add(item)
    given_items.arrange(DOWN, aligned_edge=LEFT)
    given_section = VGroup(given_title, given_items).arrange(DOWN, aligned_edge=LEFT)

    # Find section
    find_title = Text("Find:", color=YELLOW).scale(0.8)
    find_items = VGroup()
    for var in find_list:
        item = MathTex(f"{var} = ?", color=YELLOW)
        find_items.add(item)
    find_items.arrange(DOWN, aligned_edge=LEFT)
    find_section = VGroup(find_title, find_items).arrange(DOWN, aligned_edge=LEFT)

    # Arrange side by side
    problem_display = VGroup(given_section, find_section).arrange(RIGHT, buff=2).to_edge(UP)

    return problem_display

# Usage
problem = self.display_problem(
    given_dict={'u': '20 \\text{ m/s}', '\\theta': '30°', 'g': '10 \\text{ m/s}^2'},
    find_list=['h_{max}', 'R']
)
self.play(FadeIn(problem))
```

## Rendering Commands

```bash
# Preview quality (fast)
manim -pql animation.py SceneName

# Medium quality
manim -pqm animation.py SceneName

# High quality (slow)
manim -pqh animation.py SceneName

# 4K quality
manim -pqk animation.py SceneName

# Save as GIF
manim -pql --format=gif animation.py SceneName
```
