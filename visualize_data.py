import matplotlib

# Use a non-interactive backend suitable for headless environments
matplotlib.use("Agg")

import matplotlib.pyplot as plt


def create_plot() -> str:
    """Create a simple line+marker plot for the provided data and save to disk.

    Returns the absolute filepath of the saved image.
    """
    x_values = [1, 2, 3, 4, 5]
    y_values = [10, 15, 13, 17, 22]

    figure, axes = plt.subplots(figsize=(8, 5), dpi=120)
    axes.plot(
        x_values,
        y_values,
        "-o",
        color="tab:blue",
        linewidth=2.0,
        markersize=6,
        label="Data",
    )

    axes.set_title("Data Visualization", fontsize=14)
    axes.set_xlabel("x", fontsize=12)
    axes.set_ylabel("y", fontsize=12)
    axes.grid(True, linestyle=":", linewidth=0.8, alpha=0.7)
    axes.legend(loc="best")

    output_path = "/workspace/data_plot.png"
    figure.tight_layout()
    figure.savefig(output_path, dpi=200)
    plt.close(figure)

    return output_path


if __name__ == "__main__":
    saved_path = create_plot()
    print(f"Plot saved to: {saved_path}")

