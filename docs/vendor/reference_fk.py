#!/usr/bin/env python3
"""Independent forward kinematics for the vendored SO-101 URDF.

This is the cross-check behind the "known poses" in test.mjs. It shares no code with arm3d.js:
it reads the URDF with an XML parser, follows the parent/child links from the base to the
fingertip frame, and multiplies 4x4 homogeneous matrices (axis-angle joint turns).

Run:  python3 docs/vendor/reference_fk.py        (standard library only)
Prints joint origins, joint axes and the fingertip frame, in millimetres, for the poses listed
in POSES. The numbers in test.mjs were copied from this output on 2026-10-05.
"""
import math
import pathlib
import xml.etree.ElementTree as ET

URDF = pathlib.Path(__file__).with_name("so101_new_calib.urdf")
TIP = "gripper_frame_link"
POSES = {  # radians, in chain order: shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll
    "zero": [0, 0, 0, 0, 0],
    "generic": [0.4, -0.6, 0.9, 0.3, -0.7],
    "limits-ish": [-1.5, 1.2, -1.1, 1.3, 2.0],
}


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def origin(xyz, rpy):
    """URDF origin: translate, then fixed-axis roll (x), pitch (y), yaw (z) -> R = Rz Ry Rx."""
    r, p, y = rpy
    cr, sr, cp, sp, cy, sy = math.cos(r), math.sin(r), math.cos(p), math.sin(p), math.cos(y), math.sin(y)
    return [
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, xyz[0]],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, xyz[1]],
        [-sp, cp * sr, cp * cr, xyz[2]],
        [0, 0, 0, 1],
    ]


def turn(axis, angle):
    """Rodrigues' rotation about a unit axis."""
    x, y, z = axis
    c, s, t = math.cos(angle), math.sin(angle), 1 - math.cos(angle)
    return [
        [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0],
        [t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0],
        [t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0],
        [0, 0, 0, 1],
    ]


def chain():
    joints = {}
    for j in ET.parse(URDF).getroot().findall("joint"):
        o = j.find("origin")
        joints[j.find("child").get("link")] = {
            "name": j.get("name"), "type": j.get("type"), "parent": j.find("parent").get("link"),
            "xyz": [float(v) for v in o.get("xyz").split()], "rpy": [float(v) for v in o.get("rpy").split()],
            "axis": [float(v) for v in j.find("axis").get("xyz").split()] if j.find("axis") is not None else None,
        }
    out, link = [], TIP
    while link in joints:  # walk from the fingertip back to the base
        out.append(joints[link])
        link = joints[link]["parent"]
    return list(reversed(out))


def fk(q):
    T = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
    rows, k = [], 0
    for j in chain():
        T = matmul(T, origin(j["xyz"], j["rpy"]))
        pos = [T[i][3] * 1000 for i in range(3)]
        if j["type"] == "revolute":
            ax = [sum(T[i][c] * j["axis"][c] for c in range(3)) for i in range(3)]
            rows.append((j["name"], pos, ax))
            T = matmul(T, turn(j["axis"], q[k]))
            k += 1
        else:
            rows.append((j["name"], pos, None))
    return rows


if __name__ == "__main__":
    print("chain:", " -> ".join(j["name"] for j in chain()))
    for name, q in POSES.items():
        print(f"\npose {name}: q = {q}")
        for jn, pos, ax in fk(q):
            axs = "  axis (" + ", ".join(f"{v:+.6f}" for v in ax) + ")" if ax else ""
            print(f"  {jn:20s} ({pos[0]:10.4f}, {pos[1]:10.4f}, {pos[2]:10.4f}) mm{axs}")
