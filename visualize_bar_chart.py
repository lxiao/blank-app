from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless environments
import matplotlib.pyplot as plt


def main() -> None:
	# Dataset
	categories = ["A", "B", "C", "D"]
	values = [23, 17, 35, 29]

	# Figure and axis
	figure, axis = plt.subplots(figsize=(8, 5))

	# Bar colors chosen for good contrast and readability
	bar_colors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2"]
	bars = axis.bar(categories, values, color=bar_colors)

	# Titles and labels
	axis.set_title("Values by Category", fontsize=14, weight="bold")
	axis.set_xlabel("Category", fontsize=11)
	axis.set_ylabel("Value", fontsize=11)

	# Y-axis range with headroom for labels
	axis.set_ylim(0, max(values) * 1.25)

	# Grid for readability
	axis.grid(axis="y", linestyle=(0, (3, 3)), alpha=0.4)

	# Annotate bars with values
	for bar in bars:
		height = bar.get_height()
		axis.text(
			bar.get_x() + bar.get_width() / 2,
			height + (max(values) * 0.02),
			f"{int(height)}",
			ha="center",
			va="bottom",
			fontsize=10,
		)

	figure.tight_layout()

	# Output path
	output_directory = Path(__file__).parent / "visualizations"
	output_directory.mkdir(parents=True, exist_ok=True)
	output_path = output_directory / "bar_chart.png"

	figure.savefig(output_path, dpi=200)
	print(f"Saved bar chart to {output_path}")


if __name__ == "__main__":
	main()

